package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"opsdesk/backend/internal/auth"
	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

type ProfileService struct {
	repository repository.ProfileRepository
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

func NewProfileService(repository repository.ProfileRepository) ProfileService {
	return ProfileService{repository: repository}
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

	return mergeProfileIdentity(profile, identity), nil
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
	current.AvatarURL = strings.TrimSpace(input.AvatarURL)
	current.UpdatedAt = now

	if err := s.repository.UpsertProfile(ctx, current); err != nil {
		return domain.Profile{}, err
	}

	return current, nil
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
			AvatarURL:   strings.TrimSpace(profile.AvatarURL),
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
