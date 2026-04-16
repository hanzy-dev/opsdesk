package dynamodb

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"opsdesk/backend/internal/domain"
	"opsdesk/backend/internal/repository"
)

type stubClient struct {
	putItemFn func(ctx context.Context, params *dynamodb.PutItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error)
	getItemFn func(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
	scanFn    func(ctx context.Context, params *dynamodb.ScanInput, optFns ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error)
}

func (s stubClient) PutItem(ctx context.Context, params *dynamodb.PutItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error) {
	return s.putItemFn(ctx, params, optFns...)
}

func (s stubClient) GetItem(ctx context.Context, params *dynamodb.GetItemInput, optFns ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
	return s.getItemFn(ctx, params, optFns...)
}

func (s stubClient) Scan(ctx context.Context, params *dynamodb.ScanInput, optFns ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error) {
	return s.scanFn(ctx, params, optFns...)
}

func TestCreateTicketWritesExpectedItem(t *testing.T) {
	t.Parallel()

	repo := NewTicketRepository(stubClient{
		putItemFn: func(_ context.Context, params *dynamodb.PutItemInput, _ ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error) {
			if *params.TableName != "opsdesk-dev-tickets" {
				t.Fatalf("expected table name opsdesk-dev-tickets, got %q", *params.TableName)
			}

			if params.ConditionExpression == nil || *params.ConditionExpression != "attribute_not_exists(id)" {
				t.Fatalf("expected create condition expression, got %v", params.ConditionExpression)
			}

			if got := params.Item["status"].(*types.AttributeValueMemberS).Value; got != "open" {
				t.Fatalf("expected status open, got %q", got)
			}

			return &dynamodb.PutItemOutput{}, nil
		},
		getItemFn: func(context.Context, *dynamodb.GetItemInput, ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
			t.Fatal("unexpected GetItem call")
			return nil, nil
		},
		scanFn: func(context.Context, *dynamodb.ScanInput, ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error) {
			t.Fatal("unexpected Scan call")
			return nil, nil
		},
	}, "opsdesk-dev-tickets")

	err := repo.CreateTicket(context.Background(), sampleTicket())
	if err != nil {
		t.Fatalf("CreateTicket() error = %v", err)
	}
}

func TestGetTicketByIDReturnsNotFound(t *testing.T) {
	t.Parallel()

	repo := NewTicketRepository(stubClient{
		putItemFn: func(context.Context, *dynamodb.PutItemInput, ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error) {
			t.Fatal("unexpected PutItem call")
			return nil, nil
		},
		getItemFn: func(_ context.Context, _ *dynamodb.GetItemInput, _ ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
			return &dynamodb.GetItemOutput{}, nil
		},
		scanFn: func(context.Context, *dynamodb.ScanInput, ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error) {
			t.Fatal("unexpected Scan call")
			return nil, nil
		},
	}, "opsdesk-dev-tickets")

	_, err := repo.GetTicketByID(context.Background(), "TCK-9999")
	if !errors.Is(err, repository.ErrTicketNotFound) {
		t.Fatalf("expected ErrTicketNotFound, got %v", err)
	}
}

func TestGetTicketByIDReturnsTicketWithComments(t *testing.T) {
	t.Parallel()

	item := toTicketItem(sampleTicket())

	repo := NewTicketRepository(stubClient{
		putItemFn: func(context.Context, *dynamodb.PutItemInput, ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error) {
			t.Fatal("unexpected PutItem call")
			return nil, nil
		},
		getItemFn: func(_ context.Context, params *dynamodb.GetItemInput, _ ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
			if got := params.Key["id"].(*types.AttributeValueMemberS).Value; got != "TCK-0001" {
				t.Fatalf("expected key TCK-0001, got %q", got)
			}

			return &dynamodb.GetItemOutput{
				Item: mustMarshalMap(t, item),
			}, nil
		},
		scanFn: func(context.Context, *dynamodb.ScanInput, ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error) {
			t.Fatal("unexpected Scan call")
			return nil, nil
		},
	}, "opsdesk-dev-tickets")

	ticket, err := repo.GetTicketByID(context.Background(), "TCK-0001")
	if err != nil {
		t.Fatalf("GetTicketByID() error = %v", err)
	}

	if len(ticket.Comments) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(ticket.Comments))
	}

	if ticket.CreatedAt.Location() != time.UTC {
		t.Fatal("expected createdAt in UTC")
	}
}

func TestListTicketsReturnsNewestFirst(t *testing.T) {
	t.Parallel()

	oldTicket := toTicketItem(sampleTicket())
	newTicket := toTicketItem(sampleTicket())
	newTicket.ID = "TCK-0002"
	newTicket.CreatedAt = "2026-04-14T10:00:00Z"
	newTicket.UpdatedAt = "2026-04-14T10:00:00Z"

	oldTicket.ID = "TCK-0001"
	oldTicket.CreatedAt = "2026-04-14T09:00:00Z"
	oldTicket.UpdatedAt = "2026-04-14T09:00:00Z"

	repo := NewTicketRepository(stubClient{
		putItemFn: func(context.Context, *dynamodb.PutItemInput, ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error) {
			t.Fatal("unexpected PutItem call")
			return nil, nil
		},
		getItemFn: func(context.Context, *dynamodb.GetItemInput, ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
			t.Fatal("unexpected GetItem call")
			return nil, nil
		},
		scanFn: func(_ context.Context, params *dynamodb.ScanInput, _ ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error) {
			if params.FilterExpression == nil || *params.FilterExpression != "#status = :status" {
				t.Fatalf("expected status filter expression, got %v", params.FilterExpression)
			}

			return &dynamodb.ScanOutput{
				Items: []map[string]types.AttributeValue{
					mustMarshalMap(t, oldTicket),
					mustMarshalMap(t, newTicket),
				},
			}, nil
		},
	}, "opsdesk-dev-tickets")

	tickets, err := repo.ListTickets(context.Background(), repository.ListTicketsFilter{
		Status: domain.TicketStatusOpen,
	})
	if err != nil {
		t.Fatalf("ListTickets() error = %v", err)
	}

	if len(tickets.Items) != 2 {
		t.Fatalf("expected 2 tickets, got %d", len(tickets.Items))
	}

	if tickets.Items[0].ID != "TCK-0002" {
		t.Fatalf("expected newest ticket first, got %q", tickets.Items[0].ID)
	}
}

func TestUpdateTicketMapsConditionalCheckFailureToNotFound(t *testing.T) {
	t.Parallel()

	repo := NewTicketRepository(stubClient{
		putItemFn: func(_ context.Context, _ *dynamodb.PutItemInput, _ ...func(*dynamodb.Options)) (*dynamodb.PutItemOutput, error) {
			return nil, &types.ConditionalCheckFailedException{}
		},
		getItemFn: func(context.Context, *dynamodb.GetItemInput, ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
			t.Fatal("unexpected GetItem call")
			return nil, nil
		},
		scanFn: func(context.Context, *dynamodb.ScanInput, ...func(*dynamodb.Options)) (*dynamodb.ScanOutput, error) {
			t.Fatal("unexpected Scan call")
			return nil, nil
		},
	}, "opsdesk-dev-tickets")

	err := repo.UpdateTicket(context.Background(), sampleTicket())
	if !errors.Is(err, repository.ErrTicketNotFound) {
		t.Fatalf("expected ErrTicketNotFound, got %v", err)
	}
}

func sampleTicket() domain.Ticket {
	now := time.Date(2026, 4, 14, 9, 0, 0, 0, time.UTC)
	return domain.Ticket{
		ID:            "TCK-0001",
		Title:         "API timeout",
		Description:   "Investigate repeated timeout errors",
		Status:        domain.TicketStatusOpen,
		Priority:      domain.TicketPriorityHigh,
		ReporterName:  "Cloud Lab",
		ReporterEmail: "lab@example.com",
		Comments: []domain.Comment{
			{
				ID:         "CMT-0001",
				TicketID:   "TCK-0001",
				Message:    "Initial triage started",
				AuthorName: "Support Engineer",
				CreatedAt:  now,
				UpdatedAt:  now,
			},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func mustMarshalMap(t *testing.T, item ticketItem) map[string]types.AttributeValue {
	t.Helper()

	result, err := attributevalue.MarshalMap(item)
	if err != nil {
		t.Fatalf("attributevalue.MarshalMap() error = %v", err)
	}

	return result
}
