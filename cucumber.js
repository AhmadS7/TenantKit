module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/step_definitions/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress-bar', 'html:coverage/cucumber-report.html'],
    publishQuiet: true,
  },
};
