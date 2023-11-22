# catenary-frontend
## Install Dependenices
```bash
sudo apt install vite
npm install vite
npm install -D tailwindcss
npx tailwindcss init
npm update @sveltejs/kit
```
## Build and Run catenary-frontend
```bash
bun run build
bun run preview
```

#### Dev comments

command to regenerate protobuf

```bash
cd src
protoc --ts_out=gtfs_proto gtfs-realtime.proto 
```
