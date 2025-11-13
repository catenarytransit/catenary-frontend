export function cause_id_str(x: number): string {
	switch (x) {
		case 1:
			return 'alert_cause_unknown_cause';
		case 2:
			return 'alert_cause_other_cause';
		case 3:
			return 'alert_cause_technical_problem';
		case 4:
			return 'alert_cause_labour_strike';
		case 5:
			return 'alert_cause_demonstration_street_blockage';
		case 6:
			return 'alert_cause_accident';
		case 7:
			return 'alert_cause_holiday';
		case 8:
			return 'alert_cause_weather';
		case 9:
			return 'alert_cause_maintenance';
		case 10:
			return 'alert_cause_construction';
		case 11:
			return 'alert_cause_police_activity';
		case 12:
			return 'alert_cause_medical_emergency';
		default:
			return 'alert_cause_unknown_cause';
	}
}

export function effect_id_str(x: number): string {
	switch (x) {
		case 1:
			return 'alert_effect_no_service';
		case 2:
			return 'alert_effect_reduced_service';
		case 3:
			return 'alert_effect_significant_delays';
		case 4:
			return 'alert_effect_detour';
		case 5:
			return 'alert_effect_additional_service';
		case 6:
			return 'alert_effect_modified_service';
		case 7:
			return 'alert_effect_other_effect';
		case 8:
			return 'alert_effect_unknown_effect';
		case 9:
			return 'alert_effect_stop_moved';
		case 10:
			return 'alert_effect_no_effect';
		case 11:
			return 'alert_effect_accessibility_issue';
		default:
			return 'alert_effect_unknown_effect';
	}
}
