export function interpretLabelsToCode(label: any) {
    const arrayofinfo = [];

    if (label.route) {
        arrayofinfo.push(['get', 'maptag']);
    }

    if (label.trip) {
        arrayofinfo.push(['get', 'tripIdLabel']);
    }

    if (label.vehicle) {
        arrayofinfo.push(['get', 'vehicleIdLabel']);
    }

    if (label.headsign) {
        arrayofinfo.push(['get', 'headsign']);
    }

    if (label.speed) {
        //round to 0.1 place
        if (usunits === false) {
            arrayofinfo.push(['/', ['round', ['*', ['get', 'speed'], 36]], 10]);
        } else {
            arrayofinfo.push(['/', ['round', ['*', ['get', 'speed'], 22.3694]], 10]);
        }
    }

    return ['concat', ...interleave(arrayofinfo, '|')];
}