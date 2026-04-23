package service

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"unicode"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
	"opsdesk/backend/internal/storage"
)

const attachmentMaxSizeBytes int64 = 10 * 1024 * 1024

var allowedAttachmentContentTypes = map[string]struct{}{
	"application/pdf": {},
	"image/jpeg":      {},
	"image/png":       {},
	"text/plain":      {},
	"text/csv":        {},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {},
}

var allowedAttachmentExtensionsByContentType = map[string][]string{
	"application/pdf": {".pdf"},
	"image/jpeg":      {".jpg", ".jpeg"},
	"image/png":       {".png"},
	"text/plain":      {".txt", ".log"},
	"text/csv":        {".csv"},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
}

var ErrAttachmentNotFound = errors.New("attachment not found")
var ErrAttachmentStorageUnavailable = errors.New("attachment storage unavailable")
var ErrAttachmentUploadMissing = errors.New("attachment upload missing")
var ErrAttachmentTooLarge = errors.New("attachment too large")
var ErrAttachmentContentTypeNotAllowed = errors.New("attachment content type not allowed")
var ErrAttachmentInvalid = errors.New("attachment is invalid")

type AttachmentUploadURLInput struct {
	FileName    string
	ContentType string
	SizeBytes   int64
}

type AttachmentUploadURLResult struct {
	AttachmentID  string
	ObjectKey     string
	UploadURL     string
	UploadMethod  string
	UploadHeaders map[string]string
	ExpiresAt     string
}

type SaveAttachmentInput struct {
	AttachmentID string
	ObjectKey    string
	FileName     string
	ActorID      string
	ActorName    string
	ActorRole    string
}

type AttachmentDownloadURLResult struct {
	FileName    string
	DownloadURL string
	ExpiresAt   string
}

func (s *ticketService) CreateAttachmentUploadURL(ctx context.Context, ticketID string, input AttachmentUploadURLInput) (AttachmentUploadURLResult, error) {
	if s.attachmentStorage == nil {
		return AttachmentUploadURLResult{}, ErrAttachmentStorageUnavailable
	}

	if _, err := s.repo.GetTicketByID(ctx, ticketID); err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return AttachmentUploadURLResult{}, ErrTicketNotFound
		}

		return AttachmentUploadURLResult{}, err
	}

	fileName := sanitizeAttachmentFileName(input.FileName)
	contentType := strings.TrimSpace(strings.ToLower(input.ContentType))
	if fileName == "" || contentType == "" || input.SizeBytes <= 0 {
		return AttachmentUploadURLResult{}, ErrAttachmentInvalid
	}

	if input.SizeBytes > attachmentMaxSizeBytes {
		return AttachmentUploadURLResult{}, ErrAttachmentTooLarge
	}

	if !isAllowedAttachmentContentType(contentType) {
		return AttachmentUploadURLResult{}, ErrAttachmentContentTypeNotAllowed
	}

	if !isAllowedAttachmentFileName(contentType, fileName) {
		return AttachmentUploadURLResult{}, ErrAttachmentInvalid
	}

	attachmentID := s.attachmentIDFactory.Next()
	objectKey := buildAttachmentObjectKey(ticketID, attachmentID, fileName)
	if objectKey == "" {
		return AttachmentUploadURLResult{}, ErrAttachmentInvalid
	}
	upload, err := s.attachmentStorage.CreateUploadURL(ctx, objectKey, contentType)
	if err != nil {
		return AttachmentUploadURLResult{}, err
	}

	return AttachmentUploadURLResult{
		AttachmentID:  attachmentID,
		ObjectKey:     upload.ObjectKey,
		UploadURL:     upload.URL,
		UploadMethod:  upload.Method,
		UploadHeaders: upload.Headers,
		ExpiresAt:     domain.FormatTimestamp(upload.ExpiresAt),
	}, nil
}

func (s *ticketService) SaveAttachment(ctx context.Context, ticketID string, input SaveAttachmentInput) (domain.Attachment, error) {
	if s.attachmentStorage == nil {
		return domain.Attachment{}, ErrAttachmentStorageUnavailable
	}

	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Attachment{}, ErrTicketNotFound
		}

		return domain.Attachment{}, err
	}

	attachmentID := strings.TrimSpace(input.AttachmentID)
	fileName := sanitizeAttachmentFileName(input.FileName)
	objectKey := normalizeObjectKey(input.ObjectKey)
	expectedObjectKey := buildAttachmentObjectKey(ticketID, attachmentID, fileName)
	if attachmentID == "" || fileName == "" || objectKey == "" || objectKey != expectedObjectKey {
		return domain.Attachment{}, ErrAttachmentInvalid
	}

	for _, existing := range ticket.Attachments {
		if existing.ID == attachmentID {
			return existing, nil
		}
	}

	objectMetadata, err := s.attachmentStorage.HeadObject(ctx, objectKey)
	if err != nil {
		if errors.Is(err, storage.ErrObjectNotFound) {
			return domain.Attachment{}, ErrAttachmentUploadMissing
		}

		return domain.Attachment{}, err
	}

	if objectMetadata.SizeBytes <= 0 {
		return domain.Attachment{}, ErrAttachmentInvalid
	}

	if objectMetadata.SizeBytes > attachmentMaxSizeBytes {
		return domain.Attachment{}, ErrAttachmentTooLarge
	}

	contentType := strings.TrimSpace(strings.ToLower(objectMetadata.ContentType))
	if !isAllowedAttachmentContentType(contentType) {
		return domain.Attachment{}, ErrAttachmentContentTypeNotAllowed
	}

	if !isAllowedAttachmentFileName(contentType, fileName) {
		return domain.Attachment{}, ErrAttachmentInvalid
	}

	now := domain.UTCNow()
	attachment := domain.Attachment{
		ID:             attachmentID,
		TicketID:       ticket.ID,
		FileName:       fileName,
		ContentType:    contentType,
		SizeBytes:      objectMetadata.SizeBytes,
		ObjectKey:      objectKey,
		UploadedByID:   strings.TrimSpace(input.ActorID),
		UploadedByName: strings.TrimSpace(input.ActorName),
		UploadedByRole: strings.TrimSpace(input.ActorRole),
		CreatedAt:      now,
	}

	ticket.Attachments = append(ticket.Attachments, attachment)
	ticket.UpdatedAt = now
	ticket.Activities = append(ticket.Activities, s.newActivityEntry(
		ticket.ID,
		strings.TrimSpace(input.ActorID),
		strings.TrimSpace(input.ActorName),
		strings.TrimSpace(input.ActorRole),
		domain.TicketActivityAttachmentAdded,
		"Lampiran ditambahkan",
		map[string]string{
			"attachmentId": attachment.ID,
			"fileName":     attachment.FileName,
			"contentType":  attachment.ContentType,
			"sizeBytes":    fmt.Sprintf("%d", attachment.SizeBytes),
		},
		now,
	))

	if err := s.repo.UpdateTicket(ctx, ticket); err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return domain.Attachment{}, ErrTicketNotFound
		}

		return domain.Attachment{}, err
	}

	return attachment, nil
}

func (s *ticketService) CreateAttachmentDownloadURL(ctx context.Context, ticketID string, attachmentID string) (AttachmentDownloadURLResult, error) {
	if s.attachmentStorage == nil {
		return AttachmentDownloadURLResult{}, ErrAttachmentStorageUnavailable
	}

	ticket, err := s.repo.GetTicketByID(ctx, ticketID)
	if err != nil {
		if errors.Is(err, repository.ErrTicketNotFound) {
			return AttachmentDownloadURLResult{}, ErrTicketNotFound
		}

		return AttachmentDownloadURLResult{}, err
	}

	for _, attachment := range ticket.Attachments {
		if attachment.ID != strings.TrimSpace(attachmentID) {
			continue
		}

		download, err := s.attachmentStorage.CreateDownloadURL(ctx, attachment.ObjectKey, attachment.FileName)
		if err != nil {
			return AttachmentDownloadURLResult{}, err
		}

		return AttachmentDownloadURLResult{
			FileName:    attachment.FileName,
			DownloadURL: download.URL,
			ExpiresAt:   domain.FormatTimestamp(download.ExpiresAt),
		}, nil
	}

	return AttachmentDownloadURLResult{}, ErrAttachmentNotFound
}

func buildAttachmentObjectKey(ticketID string, attachmentID string, fileName string) string {
	ticketSegment := sanitizeStoragePathSegment(ticketID)
	attachmentSegment := sanitizeStoragePathSegment(attachmentID)
	fileSegment := sanitizeAttachmentObjectName(fileName)
	if ticketSegment == "" || attachmentSegment == "" || fileSegment == "" {
		return ""
	}

	return fmt.Sprintf("tickets/%s/attachments/%s/%s", ticketSegment, attachmentSegment, fileSegment)
}

func sanitizeAttachmentFileName(fileName string) string {
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

func sanitizeAttachmentObjectName(fileName string) string {
	sanitized := strings.ReplaceAll(sanitizeAttachmentFileName(fileName), " ", "-")
	if sanitized == "" {
		return "attachment"
	}

	return sanitized
}

func isAllowedAttachmentContentType(contentType string) bool {
	_, ok := allowedAttachmentContentTypes[strings.TrimSpace(strings.ToLower(contentType))]
	return ok
}

func isAllowedAttachmentFileName(contentType string, fileName string) bool {
	extensions, ok := allowedAttachmentExtensionsByContentType[strings.TrimSpace(strings.ToLower(contentType))]
	if !ok {
		return false
	}

	extension := strings.ToLower(filepath.Ext(sanitizeAttachmentFileName(fileName)))
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

func sanitizeStoragePathSegment(value string) string {
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

func normalizeObjectKey(value string) string {
	return strings.Trim(strings.TrimSpace(value), "/")
}
