/**
 * Generates a Sequelize where clause scoped to the user's family.
 * If the user has no family (familyId is null/undefined), it returns a clause
 * that matches a non-existent placeholder UUID. This guarantees that the query
 * yields zero results instead of accidentally returning all records or records with null familyId.
 * 
 * @param {Object} req - The Express request object containing req.user
 * @returns {Object} The Sequelize where clause component
 */
export const familyWhere = (req) => {
  const familyId = req.user?.familyId;
  if (!familyId) {
    // Guaranteed to match nothing since no actual family will have this placeholder UUID
    return { familyId: '00000000-0000-0000-0000-000000000000' };
  }
  return { familyId };
};
