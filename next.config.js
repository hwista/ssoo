/** @type {import('next').NextConfig} */
const nextConfig = {
  // LanceDB 네이티브 모듈 외부화
  serverExternalPackages: ['@lancedb/lancedb'],

  // 웹팩 설정 (네이티브 모듈 처리)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버 사이드에서 네이티브 모듈 처리
      config.externals = config.externals || [];
      config.externals.push({
        '@lancedb/lancedb': 'commonjs @lancedb/lancedb'
      });
    }
    return config;
  }
};

module.exports = nextConfig;
