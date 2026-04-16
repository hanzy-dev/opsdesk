package storage

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
)

var ErrObjectNotFound = errors.New("object not found")

const defaultPresignExpiry = 15 * time.Minute

type PresignedUpload struct {
	ObjectKey string
	URL       string
	Method    string
	Headers   map[string]string
	ExpiresAt time.Time
}

type PresignedDownload struct {
	URL       string
	ExpiresAt time.Time
}

type ObjectMetadata struct {
	ContentType string
	SizeBytes   int64
}

type AttachmentStorage interface {
	CreateUploadURL(ctx context.Context, objectKey string, contentType string) (PresignedUpload, error)
	CreateDownloadURL(ctx context.Context, objectKey string, fileName string) (PresignedDownload, error)
	HeadObject(ctx context.Context, objectKey string) (ObjectMetadata, error)
}

type s3Client interface {
	HeadObject(ctx context.Context, params *s3.HeadObjectInput, optFns ...func(*s3.Options)) (*s3.HeadObjectOutput, error)
}

type S3AttachmentStorage struct {
	client     s3Client
	presigner  *s3.PresignClient
	bucketName string
	expiry     time.Duration
}

func NewS3AttachmentStorage(client *s3.Client, bucketName string) *S3AttachmentStorage {
	return &S3AttachmentStorage{
		client:     client,
		presigner:  s3.NewPresignClient(client),
		bucketName: bucketName,
		expiry:     defaultPresignExpiry,
	}
}

func (s *S3AttachmentStorage) CreateUploadURL(ctx context.Context, objectKey string, contentType string) (PresignedUpload, error) {
	request, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(s.expiry))
	if err != nil {
		return PresignedUpload{}, err
	}

	return PresignedUpload{
		ObjectKey: objectKey,
		URL:       request.URL,
		Method:    "PUT",
		Headers: map[string]string{
			"Content-Type": contentType,
		},
		ExpiresAt: time.Now().UTC().Add(s.expiry).Truncate(time.Second),
	}, nil
}

func (s *S3AttachmentStorage) CreateDownloadURL(ctx context.Context, objectKey string, fileName string) (PresignedDownload, error) {
	request, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectKey),
		ResponseContentDisposition: aws.String(
			fmt.Sprintf("inline; filename*=UTF-8''%s", url.PathEscape(fileName)),
		),
	}, s3.WithPresignExpires(s.expiry))
	if err != nil {
		return PresignedDownload{}, err
	}

	return PresignedDownload{
		URL:       request.URL,
		ExpiresAt: time.Now().UTC().Add(s.expiry).Truncate(time.Second),
	}, nil
}

func (s *S3AttachmentStorage) HeadObject(ctx context.Context, objectKey string) (ObjectMetadata, error) {
	output, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && apiErr.ErrorCode() == "NotFound" {
			return ObjectMetadata{}, ErrObjectNotFound
		}

		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			return ObjectMetadata{}, ErrObjectNotFound
		}

		return ObjectMetadata{}, err
	}

	return ObjectMetadata{
		ContentType: aws.ToString(output.ContentType),
		SizeBytes:   aws.ToInt64(output.ContentLength),
	}, nil
}
