# Endpoint Integration Utilities

A standard use-case for the javascript-content-api is to integrate it into some RESTful API or other API that exposes Endpoints on the web.

To facilitate that usecase, [validation utilities](../src/integrations/parameterValidation.ts) and [wrappers](../src/integrations/endpointIntegrationWrapper.ts.ts) for different functionalities like _fetchByFilter_ or _fetchNavigation_ are provided.

### Validation Utilities

The Validation Utilities offer a simple way to test for required Paramters before passing them to the fsxa-api. They do not check the parameters semantically, as this is up to the fsxa-api implementation.

### Integration Wrappers

The Integration Wrappers are meant to be used by a webserver (like express) to safely pass parameters to the fsxa-api with error handling taken care of.
They return an Object containing the result of the Operation, with indicators of sensible return Codes and Error Messages on Errors.

Evaluating those Results and sending an appropriate response is quite easy and up to the user of the utilities. [See the reference Implementation using Express](../src/integrations/express.ts).
