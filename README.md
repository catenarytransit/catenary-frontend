# catenary-frontend
## Install Dependenices
```bash
npm install -D tailwindcss
npx tailwindcss init
```
## Run catenary-frontend
```bash
npm run dev
```

#### Dev comments

command to regenerate protobuf

```bash
cd src
protoc --js_out=gtfs_proto/ gtfs-realtime.proto 
```