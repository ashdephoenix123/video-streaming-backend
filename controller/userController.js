// @desc register user
// @route POST /api/user/register
// @access public

const registerUser = (req, res) => {
  res.status(400);
  throw new Error("Not registered");
};

module.exports = { registerUser };
