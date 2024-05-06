# catenary-frontend
## Install Dependenices
```bash
bun install
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
