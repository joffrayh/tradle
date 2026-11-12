# Tradle

Play this international wordle here: https://oec.world/en/tradle/!

# Development requirements

To test and develop new features, make sure you meet the following requirements:

| **item** | **version** |
| -------- | ----------- |
| node.js  | >=14        |
| npm      | >=8         |

# Run a local copy

```
npm ci
npm run fetch-data   # download tradle.net's schedule + country export data
npm start
```

`fetch-data` puts tradle.net's per-country files in `public/countries/` (not
committed) so the treemap values match tradle.net exactly. Without them the
game falls back to OEC's data API, whose figures are slightly different.

## Resources used:

- Countries with long/lat => https://developers.google.com/public-data/docs/canonical/countries_csv
- Country emojis => https://www.npmjs.com/package/country-emoji
