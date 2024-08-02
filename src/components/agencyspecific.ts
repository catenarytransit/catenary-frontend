export function fixHeadsignIcon(headsign: string): string | null {
    let fixPatterns = {
        'Airport': 'flight',
        'O\'Hare': 'flight',
        'Midway': 'flight',
    }

    // @ts-ignore
    if (fixPatterns[headsign]) {
        // @ts-ignore
        return fixPatterns[headsign] || null
    }
    return null
}

export function fixRouteName(chateau: string, route: string, rid: string): string {
    let fixPatterns = {
        'san-diego-mts': {
            '510': 'Blue Line',
            '520': 'Orange Line',
            '530': 'Green Line',
        }
    }

    // @ts-ignore
    if (fixPatterns[chateau]) {
        // @ts-ignore
        return fixPatterns[chateau][rid] || fixPatterns[chateau]['*'] || route.replace('Counterclockwise', 'Anticlockwise')
    } else {
        return route
    }
}

export function fixRouteIcon(chateau: string, rid: string): string | null {
    console.log(chateau, rid)
    let fixPatterns = {
        'san-diego-mts': {
            '510': '/lines/san-diego-mts/BLU.svg',
            '520': '/lines/san-diego-mts/ORG.svg',
            '530': '/lines/san-diego-mts/GRN.svg',
        }
    }

    // @ts-ignore
    if (fixPatterns[chateau]) {
        // @ts-ignore
        return fixPatterns[chateau][rid] || fixPatterns[chateau]['*'] || null
    } else {
        return null
    }
}

export function fixRouteNameLong(chateau: string, route: string, rid: string): string {
    const fixPatterns:Record<string, Record<string, string>> = {
        'metrolinktrains': {
            'Metrolink 91/Perris Valley Line': '91/Perris Valley Line',
            'Metrolink Antelope Valley Line': 'Antelope Valley Line',
            'Metrolink Inland Empire-Orange County Line': 'Inland Empire-OC Line',
            'Metrolink Orange County Line': 'Orange County Line',
            'Metrolink Riverside Line': 'Riverside Line',
            'Metrolink San Bernardino Line': 'San Bernardino Line',
            'Metrolink Ventura County Line': 'Ventura County Line',
        },
        'san-diego-mts': {
            '3': 'Ocean View Boulevard/Hillcrest',
            '5': 'Market Street',
            '215': 'Mid-City Rapid',
            '225': 'South Bay Rapid',
            '235': 'I-15 Rapid',
            '201': 'SuperLoop',
            '202': 'SuperLoop',
            '204': 'SuperLoop',
            '227': 'Iris Rapid',
            '237': 'Mira Mesa Rapid',
            '280': 'Rapid Express',
            '290': 'Rapid Express',
            '398': 'COASTER',
            '399': 'SPRINTER',
            'AIR': 'Flyer'
        }
    }

    if (fixPatterns[chateau]) {
        return fixPatterns[chateau][rid] || fixPatterns[chateau]['*'] || route.replace('Counterclockwise', 'Anticlockwise')
    } else {
        return route.replace('Transit Station', 'Sta').replace('Station', 'Sta').replace('Transportation Center', 'TC').replace('Transit Center', 'TC').replace('Transit Ctr', 'TC').trim()
    }
}

export function fixRunNumber(chateau: string, type: number, route: number, tripname: string | null, vehicle: string, trip_id: string | null): string | null {
    if (chateau == 'san-diego-mts' && type == 0) return vehicle
    if (chateau == 'northcountytransitdistrict' && route != 398) return null
    if (chateau == 'metra') {
        return vehicle
    }
    return tripname
}

export function fixHeadsignText(name: string, route: string) {

    if (name.startsWith(route)) {
        name = name.replace(route + ' - ', '').trim()
    }

    const fixPatterns:Record<string, string> = {
        'L.A. Union Station': 'Los Angeles',
        '12th & Imperial': '12th/Imp\'l',
        'El Cajon / Arnele': 'El Cajon',
        'Downtown SD': 'Downtown',
        'Ucsd': 'UCSD',
        'Sdsu': 'SDSU',
        'Utc': 'UTC',
        'Va / Ucsd': 'UTC',
        'UTC/VA Med Ctr': 'UTC',
        'Old Town to Airport Shuttle': 'Airport',
    }

    return fixPatterns[name] || fixStationName(name)
}

export function fixStationName(name: string) {
    const fixPatterns:Record<string,string> = {
        'L.A. Union Station': 'Los Angeles',
        'Sabre Springs & Penasquitos Transit Station': 'Sabre Springs/Peñasquitos',
        'Clairemont Mesa Bl & Complex Dr': 'Kearny Mesa',
        '32nd/Commercial St Station': '32nd & Commercial',
        '25th/Commercial St Station': '25th & Commercial',
        'I-15 Centerline Sta & University Av': 'City Heights',
        'I-15 Centerline Sta & El Cajon Bl': 'Boulevard',
        'San Diego - Santa Fe Depot': 'Santa Fe Depot',
        'San Diego - Old Town': 'Old Town',
        'Burbank Airport - North (Av Line) Metrolink Station': 'Burbank Airport North',
        'Burbank Airport - South (Vc Line) Metrolink Station': 'Burbank Airport South',
    }

    return fixPatterns[name] || name.replace(' Transit Station', '').replace('Transit Sta', '').replace('Transportation Center', '').replace('Transit Center', '').replace('Transit Ctr', '').replace(' Station', '').replace(' Metrolink', '').replace(' Amtrak', '').trim()
}