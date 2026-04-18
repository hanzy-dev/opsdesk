package service

import (
	"context"
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

func NewProfileService(repository repository.ProfileRepository) ProfileService {
	return ProfileService{repository: repository}
}

func (s ProfileService) GetCurrentProfile(ctx context.Context, identity auth.Identity) (domain.Profile, error) {
	profile, err := s.repository.GetProfileBySubject(ctx, identity.Subject)
	if err != nil {
		if err == repository.ErrProfileNotFound {
			return DefaultProfile(identity), nil
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
