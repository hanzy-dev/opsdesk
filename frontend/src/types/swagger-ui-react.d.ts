declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  export type SwaggerUIProps = {
    defaultModelsExpandDepth?: number;
    displayRequestDuration?: boolean;
    docExpansion?: "list" | "full" | "none";
    persistAuthorization?: boolean;
    url?: string;
  };

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
