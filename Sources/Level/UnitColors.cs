using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Level
{
	public class UnitColors
	{
		public static double GetUnitHue(int id)
		{
			double hue = 25.0 * id;
			if (hue > 255) hue *= Math.Cos(id);
			return hue;
		}
	}
}