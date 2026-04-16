package dto

type AuthIdentityResponse struct {
	Subject  string   `json:"subject"`
	Username string   `json:"username"`
	Email    string   `json:"email"`
	Name     string   `json:"name,omitempty"`
	TokenUse string   `json:"tokenUse"`
	Role     string   `json:"role"`
	Groups   []string `json:"groups,omitempty"`
}
