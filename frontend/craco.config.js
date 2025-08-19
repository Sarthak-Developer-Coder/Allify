// CRACO config to tweak webpack without ejecting.
// - Suppress source map warnings for specific third-party packages.
// - Keep defaults otherwise.
module.exports = {
	webpack: {
		configure: (webpackConfig) => {
			// Exclude problematic packages from source-map-loader to silence warnings
			const rule = webpackConfig.module.rules.find(r => r.enforce === 'pre' && String(r.use?.[0]?.loader||'').includes('source-map-loader'));
			if (rule) {
				rule.exclude = [
					/@mediapipe[\\/]tasks-vision/,
					/@react-three[\\/]drei[\\/]node_modules[\\/]@mediapipe[\\/]tasks-vision/,
					/@met4citizen[\\/]talkinghead/
				];
			}
					// Ignore specific noisy warnings
					webpackConfig.ignoreWarnings = [
						/Critical dependency: the request of a dependency is an expression/
					];
			return webpackConfig;
		}
	}
};
