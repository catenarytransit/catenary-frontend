export interface NativeLand {
	nations: string[] | null;
	title_translated: Record<string, string>;
	agency_statement: Record<string, string> | null;
	default_language_code: string;
	links: NativeLink[];
}

export interface NativeLink {
	title: string;
	url: string;
}

export const native_lands_db: Record<string, NativeLand> = {
	edmontontransitsystem: {
		nations: null,
		title_translated: {
			en: 'Indigenous peoples of Edmonton'
		},
		default_language_code: 'en',
		agency_statement: {
			en: 'The City of Edmonton acknowledges the traditional land on which we reside, is in Treaty Six Territory. We would like to thank the diverse Indigenous Peoples whose ancestors’ footsteps have marked this territory for centuries, such as nêhiyaw (Nay-hee-yow), Dene (Deh-neyh), Anishinaabe (Ah-nish-in-ah-bay), Nakota Isga (Na-koh-tah ee-ska), and Niitsitapi (Nit-si-tahp-ee) peoples. We also acknowledge this as the Métis’ (May-tea) homeland and the home of one of the largest communities of Inuit south of the 60th parallel. It is a welcoming place for all peoples who come from around the world to share Edmonton as a home. Together we call upon all of our collective, honoured traditions and spirits to work in building a great city for today and future generations.'
		},
		links: [
			{
				title: 'City of Edmonton - Indigenous Relations Office',
				url: 'https://www.edmonton.ca/city_government/indigenous-relations-office'
			},
			{
				title: 'City of Edmonton - Truth and Reconciliation',
				url: 'https://www.edmonton.ca/city_government/indigenous-relations-office/truth-reconciliation'
			}
		]
	},
	'vancouver-british-columbia-canada': {
		nations: null,
		title_translated: {
			en: 'Indigenous peoples of Vancouver'
		},
		default_language_code: 'en',
		agency_statement: {
			en: 'TransLink respects the First Nations for their stewardship of the region from time immemorial and acknowledges all First Nations, Inuit, and Métis Peoples for their continued resilience as active members of the community for generations to come. We recognize that in planning and managing the region’s transportation system we have a role to play in supporting reconciliation.'
		},
		links: [
			{
				url: 'https://www.translink.ca/about-us/about-translink/indigenous-relations',
				title: 'TransLink - Indigenous Relations, Art, and Initiatives'
			}
		]
	},
	ttc: {
		nations: null,
		title_translated: {
			en: 'Indigenous peoples of Toronto'
		},
		default_language_code: 'en',
		agency_statement: {
			en: 'The Toronto Transit Commission acknowledges that it operates in the territory of the Anishinaabeg, the Haudenosaunee Confederacy, the Wendat, and the Mississaugas of the Credit First Nation. We acknowledge that Toronto is covered by Treaty 13 with the Mississaugas of the Credit.'
		},
		links: [
			{
				title: 'City of Toronto - Indigenous Affairs Office',
				url: 'https://www.toronto.ca/city-government/accessibility-human-rights/indigenous-affairs-office/'
			}
		]
	},
	calgarytransit: {
		nations: null,
		title_translated: {
			en: 'Indigenous peoples of Calgary'
		},
		default_language_code: 'en',
		agency_statement: {
			en: 'We appreciate and acknowledge that we live, work, and play on the ancestral and traditional territories of the Blackfoot confederacy, made up of the Siksika, Piikani, Amskaapipiikani and Kainai First Nations; the Îethka Nakoda Wîcastabi First Nations, comprised of the Chiniki, Bearspaw, and Goodstoney First Nations; and the Tsuut’ina First Nation.'
		},
		links: [
			{
				title: 'City of Calgary - Indigenous Relations',
				url: 'https://www.calgary.ca/content/www/en/home/communities/indigenous.html'
			},
			{
				title: 'Indigenous Communities in and around Calgary',
				url: 'https://www.calgary.ca/communities/indigenous/groups-in-calgary.html'
			}
		]
	}
};
