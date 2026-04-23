package service

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
	"opsdesk/backend/internal/storage"
)

type ProfileService struct {
	repository    repository.ProfileRepository
	avatarStorage storage.AttachmentStorage
}

type UpdateProfileInput struct {
	DisplayName string
	AvatarURL   string
}

type AssignableUser struct {
	Subject     string
	DisplayName string
	Email       string
	AvatarURL   string
	Role        string
}

type AvatarUploadURLInput struct {
	FileName    string
	ContentType string
	SizeBytes   int64
}

type AvatarUploadURLResult struct {
	ObjectKey     string
	UploadURL     string
	UploadMethod  string
	UploadHeaders map[string]string
	ExpiresAt     string
}

const avatarMaxSizeBytes int64 = 5 * 1024 * 1024

var allowedAvatarContentTypes = map[string]struct{}{
	"image/jpeg": {},
	"image/png":  {},
	"image/webp": {},
}

var allowedAvatarExtensionsByContentType = map[string][]string{
	"image/jpeg": {".jpg", ".jpeg"},
	"image/png":  {".png"},
	"image/webp": {".webp"},
}

var ErrProfileAvatarStorageUnavailable = errors.New("profile avatar storage unavailable")
var ErrProfileAvatarUploadMissing = errors.New("profile avatar upload missing")
var ErrProfileAvatarTooLarge = errors.New("profile avatar too large")
var ErrProfileAvatarContentTypeNotAllowed = errors.New("profile avatar content type not allowed")
var ErrProfileAvatarInvalid = errors.New("profile avatar invalid")

func NewProfileService(repository repository.ProfileRepository, avatarStorages ...storage.AttachmentStorage) ProfileService {
	var avatarStorage storage.AttachmentStorage
	if len(avatarStorages) > 0 {
		avatarStorage = avatarStorages[0]
	}

	return ProfileService{
		repository:    repository,
		avatarStorage: avatarStorage,
	}
}

func (s ProfileService) GetCurrentProfile(ctx context.Context, identity auth.Identity) (domain.Profile, error) {
	profile, err := s.repository.GetProfileBySubject(ctx, identity.Subject)
	if err != nil {
		if err == repository.ErrProfileNotFound {
			defaultProfile := DefaultProfile(identity)
			if upsertErr := s.repository.UpsertProfile(ctx, defaultProfile); upsertErr != nil {
				return domain.Profile{}, upsertErr
			}
			return defaultProfile, nil
		}
		return domain.Profile{}, err
	}

	profile = mergeProfileIdentity(profile, identity)
	return s.hydrateProfileAvatarURL(ctx, profile)
}

func (s ProfileService) UpdateCurrentProfile(ctx context.Context, identity auth.Identity, input UpdateProfileInput) (domain.Profile, error) {
	current, err := s.repository.GetProfileBySubject(ctx, identity.Subject)
	if err != nil {
		if err != repository.ErrProfileNotFound {
			return domain.Profile{}, err
		}
		current = DefaultProfile(identity)
	}

	now := time.Now().UTC()
	if current.CreatedAt.IsZero() {
		current.CreatedAt = now
	}

	current.Subject = identity.Subject
	current.Email = identity.Email
	current.Role = string(identity.Role)
	current.DisplayName = strings.TrimSpace(input.DisplayName)
	avatarValue, err := s.normalizeAvatarValue(ctx, strings.TrimSpace(input.AvatarURL))
	if err != nil {
		return domain.Profile{}, err
	}
	current.AvatarURL = avatarValue
	current.UpdatedAt = now

	if err := s.repository.UpsertProfile(ctx, current); err != nil {
		return domain.Profile{}, err
	}

	return s.hydrateProfileAvatarURL(ctx, current)
}

func (s ProfileService) CreateAvatarUploadURL(ctx context.Context, identity auth.Identity, input AvatarUploadURLInput) (AvatarUploadURLResult, error) {
	if s.avatarStorage == nil {
		return AvatarUploadURLResult{}, ErrProfileAvatarStorageUnavailable
	}

	fileName := sanitizeProfileAvatarFileName(input.FileName)
	contentType := strings.TrimSpace(strings.ToLower(input.ContentType))
	if fileName == "" || contentType == "" || input.SizeBytes <= 0 {
		return AvatarUploadURLResult{}, ErrProfileAvatarInvalid
	}

	if input.SizeBytes > avatarMaxSizeBytes {
		return AvatarUploadURLResult{}, ErrProfileAvatarTooLarge
	}

	if !isAllowedAvatarContentType(contentType) {
		return AvatarUploadURLResult{}, ErrProfileAvatarContentTypeNotAllowed
	}

	if !isAllowedAvatarFileName(contentType, fileName) {
		return AvatarUploadURLResult{}, ErrProfileAvatarInvalid
	}

	objectKey := buildProfileAvatarObjectKey(identity.Subject, fileName)
	if objectKey == "" {
		return AvatarUploadURLResult{}, ErrProfileAvatarInvalid
	}
	upload, err := s.avatarStorage.CreateUploadURL(ctx, objectKey, contentType)
	if err != nil {
		return AvatarUploadURLResult{}, err
	}

	return AvatarUploadURLResult{
		ObjectKey:     upload.ObjectKey,
		UploadURL:     upload.URL,
		UploadMethod:  upload.Method,
		UploadHeaders: upload.Headers,
		ExpiresAt:     domain.FormatTimestamp(upload.ExpiresAt),
	}, nil
}

func (s ProfileService) ListAssignableUsers(ctx context.Context) ([]AssignableUser, error) {
	profiles, err := s.repository.ListProfiles(ctx)
	if err != nil {
		return nil, err
	}

	assignable := make([]AssignableUser, 0, len(profiles))
	for _, profile := range profiles {
		role := strings.ToLower(strings.TrimSpace(profile.Role))
		if role != string(auth.RoleAgent) && role != string(auth.RoleAdmin) {
			continue
		}

		assignable = append(assignable, AssignableUser{
			Subject:     profile.Subject,
			DisplayName: strings.TrimSpace(profile.DisplayName),
			Email:       strings.TrimSpace(profile.Email),
			AvatarURL:   s.resolveAvatarForResponse(ctx, strings.TrimSpace(profile.AvatarURL)),
			Role:        role,
		})
	}

	sort.Slice(assignable, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(assignable[i].DisplayName))
		right := strings.ToLower(strings.TrimSpace(assignable[j].DisplayName))
		if left == right {
			return strings.ToLower(assignable[i].Email) < strings.ToLower(assignable[j].Email)
		}
		return left < right
	})

	return assignable, nil
}

func DefaultProfile(identity auth.Identity) domain.Profile {
	now := time.Now().UTC()

	return domain.Profile{
		Subject:     identity.Subject,
		Email:       identity.Email,
		DisplayName: DisplayNameFromIdentity(identity),
		Role:        string(identity.Role),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

func DisplayNameFromIdentity(identity auth.Identity) string {
	if strings.TrimSpace(identity.Name) != "" {
		return strings.TrimSpace(identity.Name)
	}

	return strings.TrimSpace(identity.Username)
}

func mergeProfileIdentity(profile domain.Profile, identity auth.Identity) domain.Profile {
	profile.Subject = identity.Subject
	profile.Email = identity.Email
	profile.Role = string(identity.Role)
	if strings.TrimSpace(profile.DisplayName) == "" {
		profile.DisplayName = DisplayNameFromIdentity(identity)
	}
	return profile
}

func (s ProfileService) hydrateProfileAvatarURL(ctx context.Context, profile domain.Profile) (domain.Profile, error) {
	profile.AvatarURL = s.resolveAvatarForResponse(ctx, strings.TrimSpace(profile.AvatarURL))
	return profile, nil
}

func (s ProfileService) resolveAvatarForResponse(ctx context.Context, value string) string {
	avatarValue := strings.TrimSpace(value)
	if avatarValue == "" {
		return ""
	}

	if !isStoredAvatarObjectKey(avatarValue) || s.avatarStorage == nil {
		return avatarValue
	}

	download, err := s.avatarStorage.CreateDownloadURL(ctx, avatarValue, filepath.Base(avatarValue))
	if err != nil {
		return ""
	}

	return download.URL
}

func (s ProfileService) normalizeAvatarValue(ctx context.Context, value string) (string, error) {
	avatarValue := strings.TrimSpace(value)
	if avatarValue == "" {
		return "", nil
	}

	if !isStoredAvatarObjectKey(avatarValue) {
		return avatarValue, nil
	}

	if s.avatarStorage == nil {
		return "", ErrProfileAvatarStorageUnavailable
	}

	metadata, err := s.avatarStorage.HeadObject(ctx, avatarValue)
	if err != nil {
		if errors.Is(err, storage.ErrObjectNotFound) {
			return "", ErrProfileAvatarUploadMissing
		}

		return "", err
	}

	if metadata.SizeBytes <= 0 {
		return "", ErrProfileAvatarInvalid
	}

	if metadata.SizeBytes > avatarMaxSizeBytes {
		return "", ErrProfileAvatarTooLarge
	}

	if !isAllowedAvatarContentType(metadata.ContentType) {
		return "", ErrProfileAvatarContentTypeNotAllowed
	}

	if !isAllowedAvatarFileName(metadata.ContentType, filepath.Base(avatarValue)) {
		return "", ErrProfileAvatarInvalid
	}

	return avatarValue, nil
}

func buildProfileAvatarObjectKey(subject string, fileName string) string {
	subjectSegment := sanitizeProfileStoragePathSegment(subject)
	fileSegment := sanitizeProfileAvatarObjectName(fileName)
	if subjectSegment == "" || fileSegment == "" {
		return ""
	}

	return fmt.Sprintf(
		"profiles/%s/avatar/%d-%s",
		subjectSegment,
		time.Now().UTC().Unix(),
		fileSegment,
	)
}

func sanitizeProfileAvatarFileName(fileName string) string {
	baseName := filepath.Base(strings.TrimSpace(fileName))
	baseName = strings.ReplaceAll(baseName, "\\", "")
	baseName = strings.ReplaceAll(baseName, "/", "")
	if baseName == "." || baseName == "" {
		return ""
	}

	var builder strings.Builder
	for _, char := range baseName {
		if unicode.IsLetter(char) || unicode.IsNumber(char) || char == '.' || char == '-' || char == '_' || char == ' ' {
			builder.WriteRune(char)
			continue
		}

		builder.WriteRune('-')
	}

	sanitized := strings.TrimSpace(builder.String())
	if len(sanitized) > 120 {
		sanitized = sanitized[:120]
	}

	return strings.Trim(strings.ReplaceAll(sanitized, "..", "."), ". ")
}

func sanitizeProfileAvatarObjectName(fileName string) string {
	sanitized := strings.ReplaceAll(sanitizeProfileAvatarFileName(fileName), " ", "-")
	if sanitized == "" {
		return "avatar"
	}

	return sanitized
}

func isAllowedAvatarContentType(contentType string) bool {
	_, ok := allowedAvatarContentTypes[strings.TrimSpace(strings.ToLower(contentType))]
	return ok
}

func isStoredAvatarObjectKey(value string) bool {
	trimmed := strings.Trim(strings.TrimSpace(value), "/")
	if !strings.HasPrefix(trimmed, "profiles/") || strings.Contains(trimmed, "..") || strings.Contains(trimmed, "\\") {
		return false
	}

	parts := strings.Split(trimmed, "/")
	return len(parts) == 4 && parts[0] == "profiles" && parts[2] == "avatar" && parts[1] != "" && parts[3] != ""
}

func isAllowedAvatarFileName(contentType string, fileName string) bool {
	extensions, ok := allowedAvatarExtensionsByContentType[strings.TrimSpace(strings.ToLower(contentType))]
	if !ok {
		return false
	}

	extension := strings.ToLower(filepath.Ext(sanitizeProfileAvatarFileName(fileName)))
	if extension == "" {
		return false
	}

	for _, allowed := range extensions {
		if extension == allowed {
			return true
		}
	}

	return false
}

func sanitizeProfileStoragePathSegment(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	var builder strings.Builder
	for _, char := range trimmed {
		if unicode.IsLetter(char) || unicode.IsNumber(char) || char == '-' || char == '_' {
			builder.WriteRune(char)
		}
	}

	return builder.String()
}
