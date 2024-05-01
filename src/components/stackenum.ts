export class StackInterface {
	public data:
		| SingleTrip
		| VehicleSelectedStack
		| RouteStack
		| StopStack
		| NearbyDeparturesStack
		| MapSelectionScreen;

	constructor(
		data:
			| SingleTrip
			| VehicleSelectedStack
			| RouteStack
			| StopStack
			| NearbyDeparturesStack
			| MapSelectionScreen
	) {
		this.data = data;
	}
}

export class MapSelectionScreen {
	public arrayofoptions: MapSelectionOption[];

	constructor(arrayofoptions: MapSelectionOption[]) {
		this.arrayofoptions = arrayofoptions;
	}
}

export class MapSelectionOption {
	public data: StopMapSelector | RouteMapSelector | VehicleMapSelector;

	constructor(data: StopMapSelector | RouteMapSelector | VehicleMapSelector) {
		this.data = data;
	}
}

export class StopMapSelector {
	public chateau_id: string;
	public stop_id: string;
	public stop_name: string;

	constructor(chateau_id: string, stop_id: string, stop_name: string) {
		this.chateau_id = chateau_id;
		this.stop_id = stop_id;
		this.stop_name = stop_name;
	}
}

export class VehicleMapSelector {
	public chateau_id: string;
	public vehicle_id: string;
	public route_id: string;
	public headsign: string;
	public triplabel: string;
	public colour: string;
	public route_short_name: string | null;
	public route_long_name: string | null;
	public route_type: number;
    public trip_short_name: string | null;

	constructor(
		chateau_id: string,
		vehicle_id: string,
		route_id: string,
		headsign: string,
		triplabel: string,
		colour: string,
		route_short_name: string | null,
		route_long_name: string | null,
		route_type: number,
        trip_short_name: string | null
	) {
		this.chateau_id = chateau_id;
		this.vehicle_id = vehicle_id;
		this.route_id = route_id;
		this.headsign = headsign;
		this.triplabel = triplabel;
		this.colour = colour;
		this.route_short_name = route_short_name;
		this.route_long_name = route_long_name;
		this.route_type = route_type;
        this.trip_short_name = trip_short_name;
	}
}

export class RouteMapSelector {
	public chateau_id: string;
	public route_id: string;
	public colour: string;
	public name: string | null;

	constructor(chateau_id: string, route_id: string, colour: string, name: string) {
		this.chateau_id = chateau_id;
		this.route_id = route_id;
		this.colour = colour;
		this.name = name;
	}
}

export class SingleTrip {
	public chateau_id: string;
	public trip_id: string | null;
	public route_id: string | null;
	public direction_id: string | null;
	public start_time: string | null;
	public start_date: string | null;
	public vehicle_id: string | null;

	constructor(
		chateau_id: string,
		trip_id: string | null,
		route_id: string | null,
		direction_id: string | null,
		start_time: string | null,
		start_date: string | null,
		vehicle_id: string | null
	) {
		this.chateau_id = chateau_id;
		this.trip_id = trip_id;
		this.route_id = route_id;
		this.direction_id = direction_id;
		this.start_time = start_time;
		this.start_date = start_date;
		this.vehicle_id = vehicle_id;
	}
}

export class RouteStack {
	public chateau_id: string;
	public route_id: string;

	constructor(chateau_id: string, route_id: string) {
		this.chateau_id = chateau_id;
		this.route_id = route_id;
	}
}

export class StopStack {
	public chateau_id: string;
	public stop_id: string;

	constructor(chateau_id: string, stop_id: string) {
		this.chateau_id = chateau_id;
		this.stop_id = stop_id;
	}
}

export class NearbyDeparturesStack {
	public chateau_id: string;
	public lat: number;
	public lon: number;

	constructor(chateau_id: string, lat: number, lon: number) {
		this.chateau_id = chateau_id;
		this.lat = lat;
		this.lon = lon;
	}
}

export class VehicleSelectedStack {
	public chateau_id: string;
	public vehicle_id: string;

	constructor(chateau_id: string, vehicle_id: string) {
		this.chateau_id = chateau_id;
		this.vehicle_id = vehicle_id;
	}
}
