interface ImportMeta {
  readonly env: { readonly PREVIEW?: boolean };
}
declare const google: {
  script: {
    run: {
      withSuccessHandler(
        handler: (value: never) => void,
      ): typeof google.script.run;
      withFailureHandler(
        handler: (error: unknown) => void,
      ): typeof google.script.run;
    };
  };
};
