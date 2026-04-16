package auth

import "context"

type Identity struct {
	Subject  string   `json:"subject"`
	Username string   `json:"username"`
	TokenUse string   `json:"tokenUse"`
	Groups   []string `json:"groups,omitempty"`
}

type contextKey string

const identityContextKey contextKey = "opsdesk.auth.identity"

func WithIdentity(ctx context.Context, identity Identity) context.Context {
	return context.WithValue(ctx, identityContextKey, identity)
}

func IdentityFromContext(ctx context.Context) (Identity, bool) {
	identity, ok := ctx.Value(identityContextKey).(Identity)
	return identity, ok
}
