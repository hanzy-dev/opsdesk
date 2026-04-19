package dto

type ProfileResponse struct {
	Subject     string `json:"subject"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	AvatarURL   string `json:"avatarUrl,omitempty"`
	Role        string `json:"role"`
}

type UpdateProfileRequest struct {
	DisplayName string `json:"displayName"`
	AvatarURL   string `json:"avatarUrl"`
}

type RequestProfileAvatarUploadURLRequest struct {
	FileName    string `json:"fileName"`
	ContentType string `json:"contentType"`
	SizeBytes   int64  `json:"sizeBytes"`
}

type RequestProfileAvatarUploadURLResponse struct {
	ObjectKey     string            `json:"objectKey"`
	UploadURL     string            `json:"uploadUrl"`
	UploadMethod  string            `json:"uploadMethod"`
	UploadHeaders map[string]string `json:"uploadHeaders"`
	ExpiresAt     string            `json:"expiresAt"`
}
