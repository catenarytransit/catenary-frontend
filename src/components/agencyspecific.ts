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

export function fixRouteName(agency: string, route: string): string {
    let fixPatterns = {
        'metrolinktrains': {
            '91/PV Line': 'Metrolink 91',
            'Metrolink Antelope Valley Line': 'AV Line',
            'IEOC LINE': 'Metrolink IEOC',
            'OC LINE': 'Metrolink OC',
            'RIV LINE': 'Metrolink RIV',
            'SB LINE': 'Metrolink SB',
            'VC LINE': 'Metrolink VC',
        },
        'lametro-rail': {
            'Metro A Line': 'A Line',
            'Metro B Line': 'B Line',
            'Metro C Line': 'C Line',
            'Metro D Line': 'D Line',
            'Metro E Line': 'E Line',
            'Metro K Line': 'K Line'
        },
        'lametro': {
            'Metro G Line 901': 'G Line',
            'Metro J Line 910/950': 'J Line',
        },
        'san-diego-mts': {
            'Blue': 'Blue Line',
            'Orange': 'Orange Line',
            'Green': 'Green Line',
            '215': 'Rapid 215',
            '225': 'Rapid 225',
            '235': 'Rapid 235',
            '201': 'SuperLoop 201',
            '202': 'SuperLoop 202',
            '204': 'SuperLoop 204',
            '227': 'Rapid 227',
            '237': 'Rapid 237',
            '280': 'Rapid Express 280',
            '290': 'Rapid Express 290',
            '398': 'COASTER',
            '399': 'SPRINTER',
            'AIR': 'Flyer'
        }
    }

    // @ts-ignore
    if (fixPatterns[agency]) {
        // @ts-ignore
        return fixPatterns[agency][route] || fixPatterns[agency]['*'] || route.replace('Counterclockwise', 'Anticlockwise')
    } else {
        return route
    }
}

// option.data.chateau_id == 'san-diego-mts' && option.data.route_type == 0

export function fixRunNumber(agency: string, route_type: number): boolean {
    if (agency == 'san-diego-mts' && route_type == 0) return true
    if (agency == 'metrolinktrains' || agency == 'amtrak') return true
    return false
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