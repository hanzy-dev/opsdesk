package dto

type AuthIdentityResponse struct {
	Subject  string   `json:"subject"`
	Username string   `json:"username"`
	TokenUse string   `json:"tokenUse"`
	Groups   []string `json:"groups,omitempty"`
}
