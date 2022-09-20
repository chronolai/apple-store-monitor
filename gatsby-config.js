module.exports = {
  siteMetadata: {
    title: `Inteleon`,
    description: `Apple Products Monitor`,
    author: `Chrono Lai`,
    siteUrl: `https://chrono.lai.github.io/apple-store-monitor`,
  },
  pathPrefix: "/apple-store-monitor",
  plugins: [
    'gatsby-plugin-postcss',
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
  ],
}
