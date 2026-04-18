package domain

import "time"

type Profile struct {
	Subject     string
	Email       string
	DisplayName string
	AvatarURL   string
	Role        string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
