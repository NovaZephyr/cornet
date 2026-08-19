ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_channel_style_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_channel_style_check CHECK (channel_style = ANY (ARRAY[
  'corenetwork','classic-2009','standard-2012','cosmic-panda','liquid-glass',
  'onechannel-2013','feather-profile','creator-studio','profile-card','community-profile',
  'video-channel','music-channel','gaming-channel','minimal-profile','channel-2015','channel-2019',
  'early-youtube-2005','star-rating-2007','transition-2010','material-lite-2015','modern-minimal-2020',
  'terminal','bento-grid','magazine','cinephile'
]));
