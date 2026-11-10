-- Backup πριν την επαναφορά: event 320, θέσεις 44/50 (2026-10-07)
-- ΠΡΙΝ (ΛΑΘΟΣ): 44 -> 5124 WEISS Adrian   50 -> 3539 Pinto Vitor
-- ΜΕΤΑ (ΣΩΣΤΟ): 44 -> 3164 WEISS Alexander 50 -> 2311 PINTO Luis

-- Για επαναφορά πίσω (αν χρειαστεί):
UPDATE bt_results_final_player_lnk SET bt_player_id=5124 WHERE id=398505 AND bt_result_final_id=23026;
UPDATE bt_results_final_player_lnk SET bt_player_id=3539 WHERE id=398506 AND bt_result_final_id=23032;

-- Κατάσταση πριν:
   id   | bt_result_final_id | bt_player_id 
--------+--------------------+--------------
 398505 |              23026 |         5124
 398506 |              23032 |         3539
(2 rows)

