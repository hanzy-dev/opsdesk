package dynamodb

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

type api interface {
	PutItem(ctx context.Context, params *dynamodb.PutItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error)
	GetItem(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
	Scan(ctx context.Context, params *dynamodb.ScanInput, optFns ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error)
}

type TicketRepository struct {
	client    api
	tableName string
}

type ticketItem struct {
	ID             string        `dynamodbav:"id"`
	Title          string        `dynamodbav:"title"`
	Description    string        `dynamodbav:"description"`
	Status         string        `dynamodbav:"status"`
	Priority       string        `dynamodbav:"priority"`
	CreatedBy      string        `dynamodbav:"createdBy"`
	CreatedByName  string        `dynamodbav:"createdByName"`
	CreatedByEmail string        `dynamodbav:"createdByEmail"`
	ReporterID     string        `dynamodbav:"reporterId"`
	ReporterName   string        `dynamodbav:"reporterName"`
	ReporterEmail  string        `dynamodbav:"reporterEmail"`
	AssigneeID     string        `dynamodbav:"assigneeId"`
	AssigneeName   string        `dynamodbav:"assigneeName"`
	AssignedAt     string        `dynamodbav:"assignedAt"`
	Comments       []commentItem `dynamodbav:"comments"`
	CreatedAt      string        `dynamodbav:"createdAt"`
	UpdatedAt      string        `dynamodbav:"updatedAt"`
}

type commentItem struct {
	ID         string `dynamodbav:"id"`
	TicketID   string `dynamodbav:"ticketId"`
	Message    string `dynamodbav:"message"`
	AuthorName string `dynamodbav:"authorName"`
	CreatedAt  string `dynamodbav:"createdAt"`
	UpdatedAt  string `dynamodbav:"updatedAt"`
}

func NewTicketRepository(client api, tableName string) *TicketRepository {
	return &TicketRepository{
		client:    client,
		tableName: tableName,
	}
}

func (r *TicketRepository) CreateTicket(ctx context.Context, ticket domain.Ticket) error {
	item, err := attributevalue.MarshalMap(toTicketItem(ticket))
	if err != nil {
		return err
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(id)"),
	})
	return mapConditionalWriteError(err)
}

func (r *TicketRepository) UpdateTicket(ctx context.Context, ticket domain.Ticket) error {
	item, err := attributevalue.MarshalMap(toTicketItem(ticket))
	if err != nil {
		return err
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(r.tableName),
		Item:                item,
		ConditionExpression: aws.String("attribute_exists(id)"),
	})
	return mapConditionalWriteError(err)
}

func (r *TicketRepository) ListTickets(ctx context.Context, filter repository.ListTicketsFilter) ([]domain.Ticket, error) {
	input := &dynamodb.ScanInput{
		TableName: aws.String(r.tableName),
	}

	expressionValues := map[string]types.AttributeValue{}
	filterExpressions := make([]string, 0, 4)

	if filter.Status != "" {
		filterExpressions = append(filterExpressions, "#status = :status")
		expressionValues[":status"] = &types.AttributeValueMemberS{Value: string(filter.Status)}
	}

	if filter.Priority != "" {
		filterExpressions = append(filterExpressions, "#priority = :priority")
		expressionValues[":priority"] = &types.AttributeValueMemberS{Value: string(filter.Priority)}
	}

	if strings.TrimSpace(filter.ReporterEmail) != "" {
		filterExpressions = append(filterExpressions, "#reporterEmail = :reporterEmail")
		expressionValues[":reporterEmail"] = &types.AttributeValueMemberS{Value: strings.TrimSpace(filter.ReporterEmail)}
	}

	if strings.TrimSpace(filter.AssigneeID) != "" {
		filterExpressions = append(filterExpressions, "#assigneeId = :assigneeId")
		expressionValues[":assigneeId"] = &types.AttributeValueMemberS{Value: strings.TrimSpace(filter.AssigneeID)}
	}

	if len(filterExpressions) > 0 {
		input.FilterExpression = aws.String(joinFilterExpressions(filterExpressions))
		input.ExpressionAttributeNames = map[string]string{
			"#status":        "status",
			"#priority":      "priority",
			"#reporterEmail": "reporterEmail",
			"#assigneeId":    "assigneeId",
		}
		input.ExpressionAttributeValues = expressionValues
	}

	output, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, err
	}

	var items []ticketItem
	if err := attributevalue.UnmarshalListOfMaps(output.Items, &items); err != nil {
		return nil, err
	}

	tickets := make([]domain.Ticket, 0, len(items))
	for _, item := range items {
		ticket, err := toDomainTicket(item)
		if err != nil {
			return nil, err
		}

		tickets = append(tickets, ticket)
	}

	sort.Slice(tickets, func(i, j int) bool {
		return tickets[i].CreatedAt.After(tickets[j].CreatedAt)
	})

	return tickets, nil
}

func (r *TicketRepository) GetTicketByID(ctx context.Context, ticketID string) (domain.Ticket, error) {
	output, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(r.tableName),
		Key: map[string]types.AttributeValue{
			"id": &types.AttributeValueMemberS{Value: ticketID},
		},
	})
	if err != nil {
		return domain.Ticket{}, err
	}

	if len(output.Item) == 0 {
		return domain.Ticket{}, repository.ErrTicketNotFound
	}

	var item ticketItem
	if err := attributevalue.UnmarshalMap(output.Item, &item); err != nil {
		return domain.Ticket{}, err
	}

	return toDomainTicket(item)
}

func toTicketItem(ticket domain.Ticket) ticketItem {
	comments := make([]commentItem, 0, len(ticket.Comments))
	for _, comment := range ticket.Comments {
		comments = append(comments, commentItem{
			ID:         comment.ID,
			TicketID:   comment.TicketID,
			Message:    comment.Message,
			AuthorName: comment.AuthorName,
			CreatedAt:  domain.FormatTimestamp(comment.CreatedAt),
			UpdatedAt:  domain.FormatTimestamp(comment.UpdatedAt),
		})
	}

	return ticketItem{
		ID:             ticket.ID,
		Title:          ticket.Title,
		Description:    ticket.Description,
		Status:         string(ticket.Status),
		Priority:       string(ticket.Priority),
		CreatedBy:      ticket.CreatedBy,
		CreatedByName:  ticket.CreatedByName,
		CreatedByEmail: ticket.CreatedByEmail,
		ReporterID:     ticket.ReporterID,
		ReporterName:   ticket.ReporterName,
		ReporterEmail:  ticket.ReporterEmail,
		AssigneeID:     ticket.AssigneeID,
		AssigneeName:   ticket.AssigneeName,
		AssignedAt:     formatOptionalTimestamp(ticket.AssignedAt),
		Comments:       comments,
		CreatedAt:      domain.FormatTimestamp(ticket.CreatedAt),
		UpdatedAt:      domain.FormatTimestamp(ticket.UpdatedAt),
	}
}

func toDomainTicket(item ticketItem) (domain.Ticket, error) {
	createdAt, err := parseTimestamp(item.CreatedAt)
	if err != nil {
		return domain.Ticket{}, err
	}

	updatedAt, err := parseTimestamp(item.UpdatedAt)
	if err != nil {
		return domain.Ticket{}, err
	}

	assignedAt, err := parseOptionalTimestamp(item.AssignedAt)
	if err != nil {
		return domain.Ticket{}, err
	}

	comments := make([]domain.Comment, 0, len(item.Comments))
	for _, comment := range item.Comments {
		createdAt, err := parseTimestamp(comment.CreatedAt)
		if err != nil {
			return domain.Ticket{}, err
		}

		updatedAt, err := parseTimestamp(comment.UpdatedAt)
		if err != nil {
			return domain.Ticket{}, err
		}

		comments = append(comments, domain.Comment{
			ID:         comment.ID,
			TicketID:   comment.TicketID,
			Message:    comment.Message,
			AuthorName: comment.AuthorName,
			CreatedAt:  createdAt,
			UpdatedAt:  updatedAt,
		})
	}

	return domain.Ticket{
		ID:             item.ID,
		Title:          item.Title,
		Description:    item.Description,
		Status:         domain.TicketStatus(item.Status),
		Priority:       domain.TicketPriority(item.Priority),
		CreatedBy:      item.CreatedBy,
		CreatedByName:  item.CreatedByName,
		CreatedByEmail: item.CreatedByEmail,
		ReporterID:     item.ReporterID,
		ReporterName:   item.ReporterName,
		ReporterEmail:  item.ReporterEmail,
		AssigneeID:     item.AssigneeID,
		AssigneeName:   item.AssigneeName,
		AssignedAt:     assignedAt,
		Comments:       comments,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}, nil
}

func parseTimestamp(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, err
	}

	return parsed.UTC(), nil
}

func parseOptionalTimestamp(value string) (time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return time.Time{}, nil
	}

	return parseTimestamp(value)
}

func formatOptionalTimestamp(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return domain.FormatTimestamp(value)
}

func joinFilterExpressions(expressions []string) string {
	return strings.Join(expressions, " AND ")
}

func mapConditionalWriteError(err error) error {
	if err == nil {
		return nil
	}

	var conditionalCheckFailed *types.ConditionalCheckFailedException
	if errors.As(err, &conditionalCheckFailed) {
		return repository.ErrTicketNotFound
	}

	return err
}
