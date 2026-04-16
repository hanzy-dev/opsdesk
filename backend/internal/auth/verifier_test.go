package auth

import "testing"

func TestExtractBearerToken(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		header    string
		want      string
		wantError error
	}{
		{
			name:      "missing header",
			header:    "",
			wantError: ErrMissingAuthorization,
		},
		{
			name:      "invalid format",
			header:    "Token abc",
			wantError: ErrInvalidAuthorization,
		},
		{
			name:      "missing token value",
			header:    "Bearer   ",
			wantError: ErrInvalidAuthorization,
		},
		{
			name:   "valid bearer token",
			header: "Bearer abc.def.ghi",
			want:   "abc.def.ghi",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := ExtractBearerToken(tt.header)
			if tt.wantError != nil {
				if err != tt.wantError {
					t.Fatalf("ExtractBearerToken() error = %v, want %v", err, tt.wantError)
				}
				return
			}

			if err != nil {
				t.Fatalf("ExtractBearerToken() unexpected error = %v", err)
			}

			if got != tt.want {
				t.Fatalf("ExtractBearerToken() = %q, want %q", got, tt.want)
			}
		})
	}
}
