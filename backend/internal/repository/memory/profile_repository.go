package memory

import (
	"context"
	"sync"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

type ProfileRepository struct {
	mu       sync.RWMutex
	profiles map[string]domain.Profile
}

func NewProfileRepository() *ProfileRepository {
	return &ProfileRepository{
		profiles: make(map[string]domain.Profile),
	}
}

func (r *ProfileRepository) GetProfileBySubject(_ context.Context, subject string) (domain.Profile, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	profile, ok := r.profiles[subject]
	if !ok {
		return domain.Profile{}, repository.ErrProfileNotFound
	}

	return profile, nil
}

func (r *ProfileRepository) UpsertProfile(_ context.Context, profile domain.Profile) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.profiles[profile.Subject] = profile
	return nil
}
