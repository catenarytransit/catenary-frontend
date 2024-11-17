# catenary-frontend

Current site URL: https://maps.catenarymaps.org

## Install Dependenices

```bash
bun install
```

## Build and Run catenary-frontend

```bash
bun run build
bun run preview
```

### Developers

Catenary Maps Web version. 

Maprender: Maplibre https://maplibre.org/maplibre-gl-js/docs/

Base layers:
https://github.com/wipfli/esa-worldcover-polygons with data from https://esa-worldcover.org/en
OpenFreeMap https://openfreemap.org/ with data from https://OpenStreetMaps.org

For the seperate but concurrent Flutter Rust project (early alpha): https://github.com/catenarytransit/catenary_flutter

eventually, both web and flutter frontend will heavily use a shared set of structs and rust code for communicating with the backend websocket server.

The project to replicate Loom (line ordering optimised maps) by Patrick Brosi, PhD is a backend project, with minimal involvement with the frontend.
