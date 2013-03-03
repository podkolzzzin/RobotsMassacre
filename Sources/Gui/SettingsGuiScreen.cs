using Gfx;
using Gui.Components;
using Robots_Massacre_Client;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Gui
{
	public delegate void OptionChange(string value);

	public class SettingsGuiScreen : GuiScreen
	{
		private Label StatsLabel;
		private TextScreen Stats;
		private Label DimensionLabel;
		private UpDownControl DimensionOption;
		private Label NameLabel;
		private TextBox NameInput;

		private int CurrentOption = 1;

		public SettingsGuiScreen(InputHandler Input)
			: base(Input, true, true, false, false)
		{
			SetTitle("settings");
			SetTip("esc to save / tab to change active option");
			InitSettings();
		}

		public void InitSettings()
		{
			Controls.Clear();

			int x = 100;
			int y = 60;

			StatsLabel = new Label(Input);
			StatsLabel.Text = "statistics:";
			StatsLabel.SetX(x);
			StatsLabel.SetY(y);
			Controls.Add(StatsLabel);

			y += 20;

			DateTime PlayingTime = new DateTime(GameComponent.GSettings.List.StatsTimePlayed);
			Stats = new TextScreen();
			Stats.SetX(x + 15);
			Stats.SetY(y);
			Stats.AddLine(GameComponent.GSettings.List.StatsKills + " kills");
			Stats.AddLine(GameComponent.GSettings.List.StatsDeaths + " deaths");
			Stats.AddLine(Int32.Parse(PlayingTime.ToString("hh")) + " hours " + Int32.Parse(PlayingTime.ToString("mm")) + " min " + Int32.Parse(PlayingTime.ToString("ss")) + " sec in game");
			Stats.AddLine(GameComponent.GSettings.List.StatsGamesPlayed + " games played");
			Stats.AddLine(GameComponent.GSettings.List.StatsAccuracy + " is your accuracy");
			Controls.Add(Stats);

			y += 20 + Stats.TotalHeight;

			DimensionLabel = new Label(Input);
			DimensionLabel.Text = "dimension:";
			DimensionLabel.SetX(x);
			DimensionLabel.SetY(y);
			Controls.Add(DimensionLabel);

			DimensionOption = new UpDownControl(Input, x + 100, y);
			DimensionOption.PushValue("640x480");
			DimensionOption.PushValue("800x600");
			DimensionOption.SetCurrent(GameComponent.GSettings.List.ScreenWidth == 640 ? 0 : 1);
			DimensionOption.CreateCallback(OnOptionChange);
			Controls.Add(DimensionOption);

			y += 20;

			NameLabel = new Label(Input);
			NameLabel.Text = "username:";
			NameLabel.SetX(x);
			NameLabel.SetY(y);
			Controls.Add(NameLabel);

			NameInput = new TextBox(Input);
			NameInput.AppendText(GameComponent.GSettings.List.Name);
			NameInput.SetX(x + 92);
			NameInput.SetY(y);
			NameInput.SetKeyDownCallback(OnOptionChange);
			Controls.Add(NameInput);
		}

		private void OnOptionChange(string value)
		{
			GuiComponent c = GetCurrentControl();

			if (c is UpDownControl) OnDimensionSelect(value);
			else if (c is TextBox) OnNameChange(value);
		}

		private void OnDimensionSelect(string value)
		{
			string[] parts = value.Split('x');
			int w = Int32.Parse(parts[0]);
			int h = Int32.Parse(parts[1]);
			GameComponent.Self.SetSize(w, h);
			GameComponent.GSettings.List.ScreenWidth = w;
			GameComponent.GSettings.List.ScreenHeight = h;
		}

		private void OnNameChange(string name)
		{
			GameComponent.GSettings.List.Name = name;
		}

		private GuiComponent GetCurrentControl()
		{
			return Controls[CurrentOption];
		}

		private int GetOptionTopOffset()
		{
			int o = 0;
			int grid_height = 20+Stats.TotalHeight;

			if (CurrentOption == 1) o = 60;
			if (CurrentOption == 3) o = 60 + 20 + grid_height;
			if (CurrentOption == 5) o = 60 + 20 + 20 + grid_height;

			return o;
		}

		public override void Update()
		{
			base.Update();

			if (Input.Esc.Clicked)
			{
				GameComponent.GSettings.Save();
			}

			if (Input.Tab.Clicked) CurrentOption += 2;

			int size = 3 * 2;
			if (CurrentOption < 0) CurrentOption += size;
			if (CurrentOption >= size) CurrentOption -= size;

			ReleaseAllFocus();
			GetCurrentControl().SetFocus(true);
		}

		public override void Render(GBitmap screen)
		{
			base.Render(screen);
			GFont.Write(screen, ">", 1, 85, GetOptionTopOffset());
		}
	}
}