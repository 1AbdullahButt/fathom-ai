# Seed recordings: sources and reuse basis (DRAFT)

All originals were downloaded into `seed/raw/<name>/` (gitignored). The demo files in
`seed/media/` were made with ffmpeg: audio only, mono, 44.1 kHz, 48 kbps MP3.

Command: `ffmpeg -i <original> -vn -ac 1 -ar 44100 -b:a 48k seed/media/<slug>.mp3`

| Slug | Kind | Duration | Size | Speakers (approx.) |
|---|---|---|---|---|
| `seattle-len-2025-03-13` | Long (local government) | 55:54 | 20.1 MB | about 7 to 9 |
| `ami-es2002a` | Short (AMI) | 21:13 | 7.6 MB | 4 |
| `ami-es2004a` | Short (AMI) | 17:29 | 6.3 MB | 4 |
| `ami-is1009a` | Short (AMI) | 13:59 | 5.0 MB | 4 |

---

## 1. `seattle-len-2025-03-13`: Seattle City Council, Libraries, Education & Neighborhoods Committee

- **Body / date:** Seattle City Council, Libraries, Education & Neighborhoods Committee.
  Thursday 13 March 2025, 9:31 to 10:27 a.m., Council Chamber, Seattle City Hall.
- **Recorded by:** Seattle Channel (the City of Seattle's government TV channel).
  Seattle Municipal Archives item #16839, Series 3902-01, original number `lib_031325_2772509`.
- **Original URL (archive record):** https://archives.seattle.gov/digital-collections/index.php/Detail/objects/278254
- **Direct file downloaded (MP4/H.264, 110.8 MB, no login):**
  https://archives.seattle.gov/digital-collections/media/collectiveaccess/quicktime/2/2/2/4/74072_ca_object_representations_media_222499_original.m4v
- **Also on Seattle Channel:** https://seattlechannel.org/mayor-and-council/city-council/2024-2025-libraries-education-and-neighborhoods-committee?videoid=x174287
- **Official agenda and minutes (Legistar event 6119):**
  - https://seattle.legistar.com/MeetingDetail.aspx?LEGID=6119&GID=393&G=FFE3B678-CEF6-4197-84AC-5204EA4CFC0C
  - Agenda: https://legistar2.granicus.com/seattle/meetings/2025/3/6119_A_Libraries%2C_Education%2C_and_Neighborhoods_Committee_25-03-13_Committee_Agenda.pdf
  - Minutes: https://legistar2.granicus.com/seattle/meetings/2025/3/6119_M_Libraries%2C_Education%2C_and_Neighborhoods_Committee_25-03-13_Committee_Minutes.pdf
- **Agenda (with timestamps from the archive record):** Call to order; approval of agenda; public comment (1:48);
  three reappointments: Seattle Public Library Board of Trustees and the Families, Education, Preschool,
  and Promise Levy Oversight Committee (4:15); Update on Chinatown International District Community
  Capacity Building (12:59); adjournment.
- **Duration:** 55:54 (3354 s). **No trimming.** The full recording is used.
- **Speakers (approximate, not verified by listening):** Per the minutes and agenda, these people were present:
  Councilmembers Maritza Rivera (chair), Alexis Mercedes Rinck, Cathy Moore and Mark Solomon; the committee clerk;
  and presenters Jennifer Chao (Director) and Sokha Danh from the Department of Neighborhoods. Public commenters
  (the public comment window is about 2.5 minutes, so likely 1 or 2) bring the estimate to **about 7 to 9 distinct voices**.
  Not every councilmember present necessarily speaks.
- **Reuse basis:** The Seattle Municipal Archives "Permissions" statement on the record page says,
  in part, "Moving image content created by the City of Seattle is public record and does not require permission for use
  as it is a public record." It also asks for this credit: "Please cite moving images materials 'Courtesy of the Seattle
  Municipal Archives' with the item number if possible."
  (Source: https://archives.seattle.gov/digital-collections/index.php/Detail/objects/278254, Permissions section.)
  - **Required credit:** *Courtesy of the Seattle Municipal Archives, #16839, Series 3902-01.*
  - **Caveats:**
    - This is a "no permission required" statement from the City, not a formal licence such as CC0 or CC BY.
    - It covers content "created by the City of Seattle". The recording was made by Seattle Channel, a City entity.
      Members of the public who speak during public comment are not City employees. Their remarks were made at an open public
      meeting, but the City's statement does not address their rights explicitly.
    - Background: this is a public record under the Washington Public Records Act (RCW 42.56). No other usage terms are stated.

---

## 2 to 4. AMI Meeting Corpus (short meetings)

- **Corpus:** AMI Meeting Corpus, by the AMI Consortium. All three are scenario-based "a" meetings (design-team
  project kickoff), recorded around 2005. Each has 4 participants who play the roles of project manager,
  industrial designer, user-interface designer and marketing expert.
- **Audio used:** the `Mix-Headset.wav` (mixed headset microphones) for each meeting.
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0).
  https://groups.inf.ed.ac.uk/ami/corpus/license.shtml (licence text: https://creativecommons.org/licenses/by/4.0/)
  - Attribution: "AMI Meeting Corpus, AMI Consortium, CC BY 4.0", with a link to https://groups.inf.ed.ac.uk/ami/corpus/.
    State that the audio was modified: converted to mono 48 kbps MP3.
- **No trimming** on any AMI file.

| Slug | Meeting ID | Site | Original URL | Duration | Speakers |
|---|---|---|---|---|---|
| `ami-es2002a` | ES2002a | Edinburgh | https://groups.inf.ed.ac.uk/ami/AMICorpusMirror/amicorpus/ES2002a/audio/ES2002a.Mix-Headset.wav | 21:13 (1272.6 s) | 4 |
| `ami-es2004a` | ES2004a | Edinburgh | https://groups.inf.ed.ac.uk/ami/AMICorpusMirror/amicorpus/ES2004a/audio/ES2004a.Mix-Headset.wav | 17:29 (1049.4 s) | 4 |
| `ami-is1009a` | IS1009a | IDIAP | https://groups.inf.ed.ac.uk/ami/AMICorpusMirror/amicorpus/IS1009a/audio/IS1009a.Mix-Headset.wav | 13:59 (838.8 s) | 4 |

## Speaker names and diarization caveats
Names come from roll call and self-introductions (mapping in seed/speakers.json).
- Seattle: AssemblyAI found 8 speakers. Councilmember Moore was not separated from other voices,
  the two remote reappointees were merged into one speaker, and a few one-word roll-call
  replies are attributed to the wrong person.
- AMI IS1009a: Janhavi's self-introduction was merged into Francina's speaker.
- AMI ES2004a: only the project manager says her name; other speakers are shown as "name not stated".
- AMI dates are approximate (corpus recorded 2005); exact days are placeholders for ordering.
