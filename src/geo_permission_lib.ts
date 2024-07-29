export const permission_to_geolocate = "permission_to_geolocate";

export function has_permission_to_geolocate():boolean {
    const check = window.localStorage.getItem(permission_to_geolocate);

    if (check == null) {
        return false;
    } else {
        if (check == "true") {
            return true;
        } else {
            return false;
        }
    }
}