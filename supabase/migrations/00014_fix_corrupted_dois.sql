-- Fix corrupted DOI values that have a URL concatenated onto the end.
-- e.g. "10.3390/jpm14070741https://www.mdpi.com/journal/jpm"
-- becomes "10.3390/jpm14070741"
update quizzes
  set doi = substring(doi from '^(.*?)https?://')
  where doi is not null
    and doi ~ 'https?://';
