const files = {
  'package.json': JSON.stringify({
    dependencies: {
      express: '4.18.2'
    }
  }),
  'server.js': `const express = require('express')
  const app = express()
  const port = 3000
  
  
  app.get('/', (req, res) => {
    res.send('Hello world')
  })
  
  app.listen(port, () => {
    console.log(\`Example app listening on port \${port}\`)
  })`
}

export { files }
