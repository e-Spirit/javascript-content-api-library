export const createNavigationServiceData = () => ({
  _embedded: [
    {
      _links: {
        self: {
          href: 'https://your.navigation-service.url/navigation/preview.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx?language=de_DE',
        },
      },
      tenantId: 'your.navigation-service',
      navigationId: 'preview.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      languageId: 'de_DE',
    },
    {
      _links: {
        self: {
          href: 'https://your.navigation-service.url/navigation/preview.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx?language=en_GB',
        },
      },
      tenantId: 'your.navigation-service',
      navigationId: 'preview.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      languageId: 'en_GB',
    },
  ],
})
