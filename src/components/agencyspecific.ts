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

export function fixRouteName(agency: string, route: string, rid: string): string {
    let fixPatterns = {
        'san-diego-mts': {
            '510': 'Blue Line',
            '520': 'Orange Line',
            '530': 'Green Line',
            '398': 'COASTER',
            '399': 'SPRINTER',
        }
    }

    // @ts-ignore
    if (fixPatterns[agency]) {
        // @ts-ignore
        return fixPatterns[agency][rid] || fixPatterns[agency]['*'] || route.replace('Counterclockwise', 'Anticlockwise')
    } else {
        return route
    }
}

export function fixRouteNameLong(agency: string, route: string, rid: string): string {
    let fixPatterns = {
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

    // @ts-ignore
    if (fixPatterns[agency]) {
        // @ts-ignore
        return fixPatterns[agency][rid] || fixPatterns[agency]['*'] || route.replace('Counterclockwise', 'Anticlockwise')
    } else {
        return route.replace('Transit Station', 'Sta').replace('Station', 'Sta').replace('Transportation Center', 'TC').replace('Transit Center', 'TC').replace('Transit Ctr', 'TC').trim()
    }
}

export function fixRunNumber(agency: string, type: number, route: number, tripname: string, vehicle: string): string | null {
    if (agency == 'san-diego-mts' && type == 0) return vehicle
    if (agency == 'northcountytransitdistrict' && route != 398) return null
    return tripname
}

export function fixStationName(name: string) {
    console.log(name)
    let fixPatterns = [
        ['L.A. Union Station', 'Los Angeles'],
        ['North Hollywood Station', 'NoHo'],
        ['North Hollywood Station G - Line', 'NoHo'],
        ['Chatsworth Station G - Line', 'Chatsworth'],
        ['Union Station', 'UnionSta'],
        ['Wilshire / Western Station', 'Wil/Wstrn'],
        ['Wilshire / Vermont Station', 'Wilshire Ctr'],
        ['Downtown Long Beach Station', 'Long Bch'],
        ['APU / Citrus College Station', 'Azusa'],
        ['Redondo Beach Station', 'Redondo Bch'],
        ['Norwalk Station', 'Norwalk'],
        ['Downtown Santa Monica Station', 'S Monica'],
        ['Atlantic Station', 'East LA'],
        ['Expo / Crenshaw Station', 'Expo/Crnshw'],
        ['Westchester / Veterans Station', 'Westchester'],
        ['University & College', 'City Heights'],
        ['12th & Imperial', '12th/Imp\'l'],
        ['El Cajon / Arnele', 'El Cajon'],
        ['Crenshaw C-Line Station', 'Crenshaw'],
        ['Otay Mesa Transit Center', 'Otay Mesa'],
        ['Redmond Technology', 'Redmond Tech'],
        ['South Bellevue', 'S Bellevue'],
        ['Downtown SD', 'Downtown'],
        ['Ucsd', 'UCSD'],
        ['Sdsu', 'SDSU'],
        ['Utc', 'UTC'],
        ['Va / Ucsd', 'UTC'],
        ['UTC/VA Med Ctr', 'UTC'],
        ['Old Town to Airport Shuttle', 'Airport'],
    ]

    for (let i = 0; i < fixPatterns.length; i++) {
        if (name == (fixPatterns[i][0])) {
            return fixPatterns[i][1]
        }
    }

    return fixStationNameLong(name)
}

export function fixStationNameLong(name: string) {
    let fixPatterns = [
        ['Union Station', 'Union Station'],
        ['APU / Citrus College Station', 'APU/Citrus'],
        ['Atlantic Station', 'East Los Angeles'],
        ['Wilshire / Western Station', 'Wilshire/Western'],
        ['Wilshire / Vermont Station', 'Wilshire/Vermont'],
        ['12th & Imperial', '12th & Imperial'],
        ['North Hollywood Station G - Line', 'North Hollywood'],
        ['Old Town to Airport Shuttle', 'Airport'],
        ['Sabre Springs & Penasquitos Transit Station', 'Sabre Springs/Peñasquitos'],
        ['Clairemont Mesa Bl & Complex Dr', 'Kearny Mesa'],
        ['I-15 Centerline Sta & University Av', 'City Heights'],
        ['I-15 Centerline Sta & El Cajon Bl', 'Boulevard'],
        ['A Pacific Beach', 'Pacific Beach - 9A'],
    ]

    for (let i = 0; i < fixPatterns.length; i++) {
        if (name == (fixPatterns[i][0])) {
            return fixPatterns[i][1]
        }
    }

    return name.replace(' Transit Station', '').replace(' Station', '').replace(' Metrolink', '').replace('Rapid ', '').replace(' Amtrak', '').replace(' Sta', '').replace('Local', '').replace('Express', '').replace('Downtown ', '').replace('Transportation Center', '').replace('Transit Center', '').replace('Transit Ctr', '').trim()
}