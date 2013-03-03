using Gfx;
using Gui;
using Gui.Components;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Robots_Massacre_Client
{
	public partial class GameComponent : Form
	{
		private GBitmap Screen;
		private InputHandler Input;
		public static Timer GameTimer;
		public static Settings GSettings = new Settings();
		public static GameComponent Self;

		private static List<GuiScreen> Screens = new List<GuiScreen>();
		private static List<int> HistoryIndexesStack = new List<int>();
		private static int CurrentScreenIndex;
		private static bool QuitOnNextTick = false;
		private static int GameWidth, GameHeight;

		// Determines whether to display the internal information and graphics (such as ranges, e.g.)
		public const bool DEV = true;

		public GameComponent()
		{
			InitializeComponent();
			this.DoubleBuffered = true;
			Self = this;

			this.Load += new EventHandler(RunGame);
			this.Paint += new PaintEventHandler(Render);
			this.LostFocus += new EventHandler(FocusLost);
			this.FormClosing += OnQuit;

			GameTimer = new Timer();
			GameTimer.Interval = 40;
			GameTimer.Tick += new EventHandler(GameTick);
			GameTimer.Start();
		}

		private void RunGame(object Sender, EventArgs e)
		{
			Screen = new GBitmap(120 * 30, 120 * 30);
			GSettings.Load();

			this.Input = new InputHandler(this);

			AddScreen(new MenuGuiScreen(Input));
			AddScreen(new JoinGuiScreen(Input));
			AddScreen(new InstructionsGuiScreen(Input));
			AddScreen(new CreditsGuiScreen(Input));
			AddScreen(new GameGuiScreen(Input));
			AddScreen(new GameModeGuiScreen(Input));
			AddScreen(new MapEditorSelectScreen(Input));
			AddScreen(new CreateMapGuiScreen(Input));
			AddScreen(new OpenMapGuiScreen(Input));
			AddScreen(new MapEditorGuiScreen(Input, Screen));
			AddScreen(new LevelSelectGuiScreen(Input));
			AddScreen(new SettingsGuiScreen(Input));
			AddScreen(new MapEditorHelpGuiScreen(Input));
			AddScreen(new MapWarehouseGuiScreen(Input));

			SetCurrentScreen(0);
			SetCurrentScreen(11);

			SetSize(GSettings.List.ScreenWidth, GSettings.List.ScreenHeight);
		}

		private void SaveSize(int w, int h)
		{
			GameWidth = w;
			GameHeight = h;
		}

		private void CreateDrawableGraphics()
		{
			Screen.SetScreenSize(GameWidth, GameHeight);
			Screen.SetOffset(0, 0);
		}

		public void SetSize(int w, int h)
		{
			Size size = new Size(w + 16, h + 39);
			this.MinimumSize = size;
			this.ClientSize = size;
			this.MaximumSize = size;

			SaveSize(w, h);
			CreateDrawableGraphics();
			GetCurrentScreen().Resized();
		}

		private void GameTick(object Sender, EventArgs e)
		{
			if (QuitOnNextTick)
			{
				this.Close();
			}

			DateTime start = DateTime.Now;

			this.Update();
			this.Draw();

			DateTime end = DateTime.Now;
			double elapsed = (end - start).TotalMilliseconds;
			if (elapsed == 0) elapsed = 1;
			int fps = (int)(1000 / elapsed);

			Text = "Robots Massacre (" + fps + " fps)";
		}

		private void FocusLost(object sender, EventArgs e)
		{
			Input.ReleaseAll();
		}

		private void OnQuit(object sender, FormClosingEventArgs e)
		{
			GameTimer.Stop();

			try
			{
				((GameGuiScreen)GetScreen(4)).Client.Disconnect();
			}
			catch { }
		}

		public static void Quit()
		{
			QuitOnNextTick = true;
		}

		private new void Update()
		{
			Input.Tick();
			GetCurrentScreen().Update();
		}

		private void Draw()
		{
			if (Screen == null) return;
			if (!GetCurrentScreen().NonClearableScreen) Screen.Fill(255, 0, 0, 0);
			GetCurrentScreen().Render(Screen);
			Invalidate();
		}

		private void Render(object Sender, PaintEventArgs e)
		{
			if (Screen == null) return;

			e.Graphics.CompositingMode = CompositingMode.SourceOver;
			e.Graphics.CompositingQuality = CompositingQuality.HighSpeed;
			e.Graphics.SmoothingMode = SmoothingMode.None;
			e.Graphics.PixelOffsetMode = PixelOffsetMode.Half;
			e.Graphics.InterpolationMode = InterpolationMode.NearestNeighbor;

			e.Graphics.Clear(Color.Black);
			((MapEditorGuiScreen)Screens[9]).Graphics = e.Graphics;
			e.Graphics.DrawImageUnscaled(Screen.GetClippedImage(), Point.Empty);
		}

		public static OptionList Gs
		{
			get
			{
				return GSettings.List;
			}
		}

		public static int GetScreenWidth()
		{
			return GameWidth;
		}

		public static int GetScreenHeight()
		{
			return GameHeight;
		}

		public static void AddScreen(GuiScreen screen)
		{
			Screens.Add(screen);
		}

		public static GuiScreen GetScreen(int s)
		{
			return Screens[s];
		}

		public static GuiScreen GetCurrentScreen()
		{
			return GetScreen(CurrentScreenIndex);
		}

		public static void SetCurrentScreen(int s)
		{
			HistoryIndexesStack.Add(CurrentScreenIndex);
			CurrentScreenIndex = s;
		}

		public static void SetPreviousScreen()
		{
			int index = HistoryIndexesStack.Count - 1;
			if (index >= 0)
			{
				int tScreen = HistoryIndexesStack[index];
				HistoryIndexesStack.RemoveAt(index);
				CurrentScreenIndex = tScreen;
			}
		}

		public static bool IsScreen(int index)
		{
			return index == CurrentScreenIndex;
		}
	}
}