/* Client reviews shown on the website.
   Only real reviews from real clients, shared with their permission.
   Add one line per review, newest first. Fields:
     c        product code, e.g. 'W005'
     rating   1 to 5, as the client gave it
     text     their words (lightly tidied for spelling only)
     name     first name and initial, e.g. 'Ananya R.'
     city     e.g. 'Bengaluru'
     colour   optional, the colour they bought
     size     optional
     date     'YYYY-MM-DD'
     photo    optional, a photo file in assets/img/reviews/ (without .webp), shared with permission
     verified true if it came from a real order (it always should)
   Once the order sheet is connected, reviews ticked "Approved" in its Reviews tab are added automatically. */
window.VE_REVIEWS = [
];
