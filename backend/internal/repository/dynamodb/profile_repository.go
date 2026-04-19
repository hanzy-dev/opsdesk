package dynamodb

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

type ProfileRepository struct {
	client    api
	tableName string
}

type profileItem struct {
	Subject     string `dynamodbav:"subject"`
	Email       string `dynamodbav:"email"`
	DisplayName string `dynamodbav:"displayName"`
	AvatarURL   string `dynamodbav:"avatarUrl"`
	Role        string `dynamodbav:"role"`
	CreatedAt   string `dynamodbav:"createdAt"`
	UpdatedAt   string `dynamodbav:"updatedAt"`
}

func NewProfileRepository(client api, tableName string) *ProfileRepository {
	return &ProfileRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *ProfileRepository) GetProfileBySubject(ctx context.Context, subject string) (domain.Profile, error) {
	output, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"subject": &types.AttributeValueMemberS{Value: subject},
		},
	})
	if err != nil {
		return domain.Profile{}, err
	}

	if len(output.Item) == 0 {
		return domain.Profile{}, repository.ErrProfileNotFound
	}

	var item profileItem
	if err := attributevalue.UnmarshalMap(output.Item, &item); err != nil {
		return domain.Profile{}, err
	}

	return toDomainProfile(item)
}

func (r *ProfileRepository) ListProfiles(ctx context.Context) ([]domain.Profile, error) {
	output, err := r.client.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(r.tableName),
	})
	if err != nil {
		return nil, err
	}

	var items []profileItem
	if err := attributevalue.UnmarshalListOfMaps(output.Items, &items); err != nil {
		return nil, err
	}

	profiles := make([]domain.Profile, 0, len(items))
	for _, item := range items {
		profile, err := toDomainProfile(item)
		if err != nil {
			return nil, err
		}

		profiles = append(profiles, profile)
	}

	return profiles, nil
}

func (r *ProfileRepository) UpsertProfile(ctx context.Context, profile domain.Profile) error {
	item, err := attributevalue.MarshalMap(toProfileItem(profile))
	if err != nil {
		return err
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(r.tableName),
		Item:      item,
	})
	return err
}

func toProfileItem(profile domain.Profile) profileItem {
	return profileItem{
		Subject:     profile.Subject,
		Email:       profile.Email,
		DisplayName: profile.DisplayName,
		AvatarURL:   profile.AvatarURL,
		Role:        profile.Role,
		CreatedAt:   domain.FormatTimestamp(profile.CreatedAt),
		UpdatedAt:   domain.FormatTimestamp(profile.UpdatedAt),
	}
}

func toDomainProfile(item profileItem) (domain.Profile, error) {
	createdAt, err := parseTimestamp(item.CreatedAt)
	if err != nil {
		return domain.Profile{}, err
	}

	updatedAt, err := parseTimestamp(item.UpdatedAt)
	if err != nil {
		return domain.Profile{}, err
	}

	return domain.Profile{
		Subject:     item.Subject,
		Email:       item.Email,
		DisplayName: item.DisplayName,
		AvatarURL:   item.AvatarURL,
		Role:        item.Role,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}, nil
}
