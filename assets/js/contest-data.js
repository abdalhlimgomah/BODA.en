/* ===== Contest Data Layer (Supabase queries) ===== */

window.ContestData = (function() {
  var SUPABASE = window.getSupabaseClient ? window.getSupabaseClient() : null;

  function getClient() {
    if (!SUPABASE) SUPABASE = window.getSupabaseClient ? window.getSupabaseClient() : null;
    return SUPABASE;
  }

  /* Get active campaign */
  function getActiveCampaign() {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_campaigns')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  /* Get all rewards for a campaign */
  function getRewards(campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_rewards')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });
  }

  /* Check if user is registered in a campaign */
  function getParticipant(userId, campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .maybeSingle();
  }

  /* Check by email (fallback if no user_id) */
  function getParticipantByEmail(email, campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .select('*')
      .eq('email', email)
      .eq('campaign_id', campaignId)
      .maybeSingle();
  }

  /* Register participant */
  function registerParticipant(data) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .insert([data])
      .select()
      .single();
  }

  /* Claim referral for an already-registered participant (first claim wins) */
  function claimReferral(participantId, code) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .update({ referred_by: code })
      .eq('id', participantId)
      .select()
      .single();
  }

  /* Check if referral code exists, returns user_id */
  function checkReferralCode(code) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .select('user_id')
      .eq('referral_code', code)
      .maybeSingle();
  }

  /* Create referral record */
  function createReferral(data) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('referrals')
      .insert([data])
      .select()
      .single();
  }

  /* Get referral count for a user in a campaign */
  function getReferralCount(userId, campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('referrals')
      .select('id, status', { count: 'exact' })
      .eq('referrer_user_id', userId)
      .eq('campaign_id', campaignId);
  }

  /* Get qualified referral count */
  function getQualifiedReferralCount(userId, campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('referrals')
      .select('id', { count: 'exact' })
      .eq('referrer_user_id', userId)
      .eq('campaign_id', campaignId)
      .eq('status', 'qualified');
  }

  /* Get user's reward assignments */
  function getRewardAssignments(participantId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('reward_assignments')
      .select('*, contest_rewards(*)')
      .eq('participant_id', participantId);
  }

  /* Get user's contest messages */
  function getUserMessages(userId, campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
  }

  /* Mark message as read */
  function markMessageRead(messageId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);
  }

  /* ===== Admin Queries ===== */

  function getAllParticipants(campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
  }

  function getAllReferrals(campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('referrals')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
  }

  function getAllRewardAssignments(campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('reward_assignments')
      .select('*, contest_rewards(*), contest_participants(*)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
  }

  function getAllMessages(campaignId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_messages')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
  }

  /* Upsert reward */
  function upsertReward(reward) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_rewards')
      .upsert([reward])
      .select()
      .single();
  }

  /* Delete reward */
  function deleteReward(rewardId) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_rewards')
      .delete()
      .eq('id', rewardId);
  }

  /* Create/update reward assignment */
  function upsertRewardAssignment(assignment) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('reward_assignments')
      .upsert([assignment])
      .select()
      .single();
  }

  /* Create message */
  function createMessage(msg) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_messages')
      .insert([msg])
      .select()
      .single();
  }

  /* Update campaign */
  function updateCampaign(campaignId, data) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_campaigns')
      .update(data)
      .eq('id', campaignId)
      .select()
      .single();
  }

  /* Search participants */
  function searchParticipants(campaignId, query) {
    var client = getClient();
    if (!client) return Promise.reject(new Error('Supabase client not available'));
    return client
      .from('contest_participants')
      .select('*')
      .eq('campaign_id', campaignId)
      .or('full_name.ilike.%' + query + '%,family_name.ilike.%' + query + '%,email.ilike.%' + query + '%,phone.ilike.%' + query + '%,referral_code.ilike.%' + query + '%')
      .order('created_at', { ascending: false });
  }

  return {
    getActiveCampaign: getActiveCampaign,
    getRewards: getRewards,
    getParticipant: getParticipant,
    getParticipantByEmail: getParticipantByEmail,
    registerParticipant: registerParticipant,
    claimReferral: claimReferral,
    checkReferralCode: checkReferralCode,
    createReferral: createReferral,
    getReferralCount: getReferralCount,
    getQualifiedReferralCount: getQualifiedReferralCount,
    getRewardAssignments: getRewardAssignments,
    getUserMessages: getUserMessages,
    markMessageRead: markMessageRead,
    getAllParticipants: getAllParticipants,
    getAllReferrals: getAllReferrals,
    getAllRewardAssignments: getAllRewardAssignments,
    getAllMessages: getAllMessages,
    upsertReward: upsertReward,
    deleteReward: deleteReward,
    upsertRewardAssignment: upsertRewardAssignment,
    createMessage: createMessage,
    updateCampaign: updateCampaign,
    searchParticipants: searchParticipants
  };
})();
