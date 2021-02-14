# Internal CLI Plugins

## Plugins

Configuration File

```
.rbc.js
```

```javascript
module.exports = {
    plugins: [
        "@releai/default-groups",
        declare((api) => {
            api.onCreate(parseGroups)
            api.onList()

            api.onApply(() => {

            })

            api.translations.onList(() => {

            })

            return {
                name: "some-custom-plugin",
                api
            }
        })
    ]
}
```
