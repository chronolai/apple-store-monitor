module.exports = {
  siteMetadata: {
    title: `Apple Store Monitor`,
    description: `Apple Store Monitor`,
    author: `Chrono Lai`,
    siteUrl: `https://chrono.lai.github.io/apple-store-monitor`,
  },
  pathPrefix: "/apple-store-monitor",
  plugins: [
    'gatsby-plugin-postcss',
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ["G-6TXVJSZDZ0"],
      },
    },
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
