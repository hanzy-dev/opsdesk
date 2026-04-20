declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  export type SwaggerUIProps = {
    defaultModelsExpandDepth?: number;
    displayRequestDuration?: boolean;
    docExpansion?: "list" | "full" | "none";
    onComplete?: () => void;
    onFailure?: (error: unknown) => void;
    persistAuthorization?: boolean;
    spec?: unknown;
    url?: string;
  };

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
