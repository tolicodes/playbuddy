# PlayBuddy

## Layout

- playbuddy-web
- playbuddy-scraper
- playbuddy-mobile

## Configuration

### DNS

| Name                 | Priority | Type  | Value                   |
| -------------------- | -------- | ----- | ----------------------- |
| api.playbuddy.me     | 3600     | CAA   | 0 issue letsencrypt.org |
| playbuddy.me         | 3600     | CAA   | 0 issue pki.goog        |
| scraper.playbuddy.me | 3600     | CAA   | 0 issue letsencrypt.org |
| api.playbuddy.me     | 3600     | CNAME | ghs.googlehosted.com.   |
| scraper.playbuddy.me | 3600     | CNAME | ghs.googlehosted.com.   |

Configure static hosting for playbuddy.me

#### CloudRun

1. Cloud Run > Domain Mappings > Add Mapping > playbuddy-api > Cloud Run Domain Mappings > Verify New Domain > View in Search Console > Domain > Add TXT Record > Go back to Mapping > Refresh > Select Domain > Subdomain (api) > Done
2. Same for playbuddy-scraper

## User Actions

### Events

| event_detail_get_tickets_clicked |
| event_detail_google_calendar_clicked |
| event_detail_link_clicked |
| event_detail_organizer_clicked |
| event_list_item_clicked |

### Wishlist

| event_list_item_wishlist_toggled |
| my_calendar_share_wishlist_click |
| swipe_mode_more_info_click |
| swipe_mode_swipe_left |
| swipe_mode_swipe_right |

### Calendar View

| calendar_day_clicked |
| event_calendar_view_on_press_calendar |
| event_calendar_view_on_press_day |
| event_calendar_view_on_press_private_events |
| header_back_button_clicked |
| header_drawer_button_clicked |
| header_filter_button_clicked |

### Promo Codes

| deep_link |
| deep_link_params_set |
| initial_deep_link |

### Buddies

| buddy_avatar_carousel_press |

### Communities

| community_events_community_joined |
| community_list_community_joined |
| community_list_community_left |
| community_list_navigate_to_community_events |
| community_list_navigate_to_join_community_button_pressed |

### Auth

| login_banner_clicked |
| login_button_clicked |
| personalization_modal_confirmed |
| welcome_screen_register_clicked |
| welcome_screen_skipped |
| avatar_press_pick_image |
| avatar_upload_completed |
| avatar_upload_failed |
| avatar_upload_started |

### Defaults (ex: community, location)

| default_community_selected_acro |
| defaults_menu_community_item_selected |
| defaults_menu_location_item_selected |

### Filter (deprecated)

| filter_done_button_clicked |
| filter_organizers |
| filter_organizers_reset |
| filter_reset_button_clicked |

### Moar Screen

| moar_get_add_your_events_link |
| moar_get_google_cal_link |
| moar_get_in_touch_click_email |
| moar_link_clicked |
