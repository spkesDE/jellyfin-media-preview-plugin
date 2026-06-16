import { createDefaultConfig, type StoreConfig } from '../libs/defaults';

const pluginConfig: StoreConfig = {
  ...createDefaultConfig(),
  PreviewSource: 'prefer-trailer',
  HoverMode: 'auto',
  AutoScrubMode: 'sweep'
};

const previewImage = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#00a4dc"/>
        <stop offset="1" stop-color="#2b315e"/>
      </linearGradient>
    </defs>
    <rect width="160" height="90" fill="url(#g)"/>
    <circle cx="118" cy="27" r="15" fill="#f4b84b"/>
    <path d="M0 78L38 42L67 68L91 38L160 90H0Z" fill="#101820" fill-opacity=".72"/>
  </svg>
`)}`;

export function installJellyfinDevMocks(): void {
  window.Dashboard = {
    showLoadingMsg() {},
    hideLoadingMsg() {},
    processPluginConfigurationUpdateResult() {}
  };

  window.ApiClient = {
    getCurrentUserId: () => 'dev-user',
    getUrl: (path) => path,
    getImageUrl: () => previewImage,
    getPluginConfiguration: async () => structuredClone(pluginConfig),
    updatePluginConfiguration: async (_pluginId, config) => {
      Object.assign(pluginConfig, config);
      console.info('Saved Media Preview development config', config);
      return {};
    },
    ajax: async ({ url }) => {
      if (url.includes('/Views')) {
        return {
          Items: [
            { Id: 'movies', Name: 'Movies', CollectionType: 'movies' },
            { Id: 'shows', Name: 'Shows', CollectionType: 'tvshows' }
          ]
        };
      }

      if (url.includes('/Items?')) {
        return {
          Items: [{
            Id: 'preview-movie',
            Name: 'Development Movie',
            ProductionYear: 2026,
            RunTimeTicks: 61200000000,
            OfficialRating: 'PG-13',
            CommunityRating: 8.2,
            ImageTags: { Primary: 'primary' },
            BackdropImageTags: ['backdrop']
          }]
        };
      }

      return null;
    }
  };
}
