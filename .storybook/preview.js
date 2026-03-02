/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "dark",
          value: "#0a0f1e",
        },
        {
          name: "light",
          value: "#ffffff",
        },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: "#0a0f1e", minHeight: "100vh", padding: "20px" }}>
        <Story />
      </div>
    ),
  ],
};
export default preview;
