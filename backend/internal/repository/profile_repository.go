package repository

import (
	"context"
	"errors"

	"opsdesk/backend/internal/domain"
)

var ErrProfileNotFound = errors.New("profile not found")

type ProfileRepository interface {
	GetProfileBySubject(ctx context.Context, subject string) (domain.Profile, error)
	ListProfiles(ctx context.Context) ([]domain.Profile, error)
	UpsertProfile(ctx context.Context, profile domain.Profile) error
}
